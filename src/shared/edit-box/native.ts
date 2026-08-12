/** Native textarea editing operations. */

export function writeNative(element: HTMLTextAreaElement, text: string): void {
    element.value = text;
    dispatchValueEvents(element);
}

export function writeNativePreservingPosition(
    element: HTMLTextAreaElement,
    text: string,
): void {
    const selectionStart = element.selectionStart;
    const selectionEnd = element.selectionEnd;
    const selectionDirection = element.selectionDirection;
    const scrollLeft = element.scrollLeft;
    const scrollTop = element.scrollTop;

    element.value = text;
    element.setSelectionRange(
        clampEditBoxOffset(selectionStart, text),
        clampEditBoxOffset(selectionEnd, text),
        selectionDirection,
    );
    dispatchValueEvents(element);
    restoreDomScroll(element, scrollLeft, scrollTop);
}

export function replaceNativeSelection(
    element: HTMLTextAreaElement,
    text: string,
): void {
    const from = element.selectionStart ?? element.value.length;
    const to = element.selectionEnd ?? from;
    const caret = from + text.length;
    element.value =
        element.value.slice(0, from) + text + element.value.slice(to);
    element.setSelectionRange(caret, caret);
    dispatchValueEvents(element);
}

export function restoreDomScroll(
    element:
        | {
              scrollLeft: number;
              scrollTop: number;
          }
        | undefined,
    scrollLeft: number | undefined,
    scrollTop: number | undefined,
): void {
    if (element == null || scrollLeft == null || scrollTop == null) {
        return;
    }
    element.scrollLeft = scrollLeft;
    element.scrollTop = scrollTop;
}

export function clampEditBoxOffset(offset: number, text: string): number {
    return Math.max(0, Math.min(offset, text.length));
}

function dispatchValueEvents(element: HTMLTextAreaElement): void {
    const inputEvent = new Event("input", { bubbles: true });
    element.dispatchEvent(inputEvent);
    const changeEvent = new Event("change", { bubbles: true });
    element.dispatchEvent(changeEvent);
}
