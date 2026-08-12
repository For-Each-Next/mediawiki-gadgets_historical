/** Interactive citation previews for the isolated editor surface. */

import {
    buildReferencePreview,
    type ReferencePreview,
    type ReferencePreviewField,
} from "#gadget/domain/reference-preview.ts";
import type { NamespaceSource } from "#shared/wiki-titles";

export interface ReferenceTooltipController {
    destroy(): void;
    dismiss(): void;
}

export interface ReferenceTooltipOptions {
    delay?: number;
    editor: HTMLElement;
    getNamespaceSource(): NamespaceSource | null;
    getSource(): string;
    overlay: HTMLElement;
}

export interface ReferenceTooltipRect {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
}

export interface ReferenceTooltipPlacement {
    left: number;
    maxHeight: number;
    side: "above" | "below";
    tailLeft: number;
    top: number;
}

interface TooltipSize {
    height: number;
    width: number;
}

interface TooltipViewport {
    height: number;
    width: number;
}

const DEFAULT_DELAY = 200;
const HIDE_DELAY = 200;
const REMOVE_DELAY = 200;
const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 10;
const DEFAULT_TAIL_CENTER = 26;
const MINIMUM_TAIL_INSET = 18;

/** Attaches one MediaWiki-style reference preview controller. */
// eslint-disable-next-line max-lines-per-function
export function attachReferenceTooltips(
    options: ReferenceTooltipOptions,
): ReferenceTooltipController {
    const { editor, overlay } = options;
    const view = getDocumentView(editor.ownerDocument);
    let candidate: HTMLElement | null = null;
    let popup: HTMLElement | null = null;
    let pointerY: number | undefined;
    let generation = 0;
    let showTimer = 0;
    let hideTimer = 0;
    let removeTimer = 0;

    function clearTimers(): void {
        view.clearTimeout(showTimer);
        view.clearTimeout(hideTimer);
        view.clearTimeout(removeTimer);
        showTimer = 0;
        hideTimer = 0;
        removeTimer = 0;
    }

    function removePopup(): void {
        popup?.remove();
        popup = null;
    }

    function dismiss(): void {
        generation += 1;
        clearTimers();
        removePopup();
        candidate = null;
        pointerY = undefined;
    }

    function keepOpen(): void {
        view.clearTimeout(hideTimer);
        view.clearTimeout(removeTimer);
        hideTimer = 0;
        removeTimer = 0;
        popup?.classList.remove("wiked-lite-tooltip--closing");
    }

    function startClosing(): void {
        if (popup == null) {
            candidate = null;
            return;
        }
        popup.classList.add("wiked-lite-tooltip--closing");
        const delay = view.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? 0
            : REMOVE_DELAY;
        removeTimer = view.setTimeout(dismiss, delay);
    }

    function scheduleHide(): void {
        view.clearTimeout(hideTimer);
        hideTimer = view.setTimeout(startClosing, HIDE_DELAY);
    }

    function positionPopup(): void {
        if (candidate == null || !candidate.isConnected) {
            dismiss();
            return;
        }
        if (popup == null) {
            return;
        }
        const rect = selectReferenceTooltipRect(
            Array.from(candidate.getClientRects(), copyRect),
            pointerY,
        );
        if (
            rect == null ||
            !isVisibleRect(rect, view.innerWidth, view.innerHeight)
        ) {
            dismiss();
            return;
        }
        applyPlacement(popup, rect, view.innerWidth, view.innerHeight);
    }

    function show(expectedGeneration: number): void {
        if (
            candidate == null ||
            !candidate.isConnected ||
            generation !== expectedGeneration
        ) {
            return;
        }
        const source = candidate.dataset.reference ?? "";
        const preview = buildReferencePreview(
            options.getSource(),
            source,
            options.getNamespaceSource(),
        );
        if (preview == null) {
            candidate = null;
            return;
        }
        popup = createTooltip(editor, preview, keepOpen, scheduleHide);
        overlay.append(popup);
        positionPopup();
    }

    function beginShow(anchor: HTMLElement, event: PointerEvent): void {
        const source = anchor.dataset.reference ?? "";
        const currentSource = candidate?.dataset.reference ?? "";
        candidate = anchor;
        pointerY = event.clientY;
        if (source === currentSource) {
            keepOpen();
            if (popup != null) {
                positionPopup();
            }
            return;
        }
        generation += 1;
        clearTimers();
        removePopup();
        const expectedGeneration = generation;
        const delay = normalizeDelay(options.delay);
        showTimer = view.setTimeout(() => show(expectedGeneration), delay);
    }

    function handlePointerOver(event: PointerEvent): void {
        if (event.pointerType === "touch") {
            return;
        }
        const anchor = findReferenceAnchor(editor, event.target);
        if (anchor != null) {
            beginShow(anchor, event);
        }
    }

    function handlePointerOut(event: PointerEvent): void {
        const from = findReferenceAnchor(editor, event.target);
        if (from == null) {
            return;
        }
        const to = findReferenceAnchor(editor, event.relatedTarget);
        if (sameReference(from, to)) {
            return;
        }
        view.clearTimeout(showTimer);
        showTimer = 0;
        if (popup == null) {
            candidate = null;
        } else {
            scheduleHide();
        }
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            dismiss();
        }
    }

    editor.addEventListener("pointerover", handlePointerOver);
    editor.addEventListener("pointerout", handlePointerOut);
    editor.addEventListener("scroll", positionPopup);
    editor.addEventListener("keydown", handleKeydown);
    view.addEventListener("resize", positionPopup);

    return {
        destroy() {
            dismiss();
            editor.removeEventListener("pointerover", handlePointerOver);
            editor.removeEventListener("pointerout", handlePointerOut);
            editor.removeEventListener("scroll", positionPopup);
            editor.removeEventListener("keydown", handleKeydown);
            view.removeEventListener("resize", positionPopup);
        },
        dismiss,
    };
}

/** Calculates a viewport-safe anchored tooltip position. */
export function calculateReferenceTooltipPlacement(
    anchor: ReferenceTooltipRect,
    tooltip: TooltipSize,
    viewport: TooltipViewport,
): ReferenceTooltipPlacement {
    const above = Math.max(0, anchor.top - VIEWPORT_MARGIN - ANCHOR_GAP);
    const below = Math.max(
        0,
        viewport.height - anchor.bottom - VIEWPORT_MARGIN - ANCHOR_GAP,
    );
    const side = selectSide(tooltip.height, above, below);
    const maxHeight = side === "above" ? above : below;
    const height = Math.min(tooltip.height, maxHeight);
    const anchorCenter = anchor.left + anchor.width / 2;
    const maximumLeft = viewport.width - tooltip.width - VIEWPORT_MARGIN;
    const left = clamp(
        anchorCenter - DEFAULT_TAIL_CENTER,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, maximumLeft),
    );
    const tailLeft = clamp(
        anchorCenter - left,
        MINIMUM_TAIL_INSET,
        Math.max(MINIMUM_TAIL_INSET, tooltip.width - MINIMUM_TAIL_INSET),
    );
    return {
        left,
        maxHeight,
        side,
        tailLeft,
        top:
            side === "above"
                ? anchor.top - ANCHOR_GAP - height
                : anchor.bottom + ANCHOR_GAP,
    };
}

/** Selects the wrapped reference rectangle under the pointer. */
export function selectReferenceTooltipRect(
    rects: readonly ReferenceTooltipRect[],
    pointerY?: number,
): ReferenceTooltipRect | undefined {
    const visible = rects.filter((rect) => rect.width > 0 && rect.height > 0);
    if (pointerY == null) {
        return visible[0];
    }
    return (
        visible.find(
            (rect) => rect.top <= pointerY && pointerY <= rect.bottom,
        ) ?? visible[0]
    );
}

function selectSide(
    tooltipHeight: number,
    above: number,
    below: number,
): "above" | "below" {
    if (tooltipHeight <= above) {
        return "above";
    }
    if (tooltipHeight <= below) {
        return "below";
    }
    return above >= below ? "above" : "below";
}

function applyPlacement(
    popup: HTMLElement,
    anchor: ReferenceTooltipRect,
    viewportWidth: number,
    viewportHeight: number,
): void {
    const surface = popup.querySelector<HTMLElement>(
        ".wiked-lite-tooltip__surface",
    );
    if (surface == null) {
        return;
    }
    surface.style.removeProperty("max-height");
    const measuredHeight = popup.offsetHeight;
    const placement = calculateReferenceTooltipPlacement(
        anchor,
        { height: measuredHeight, width: popup.offsetWidth },
        { height: viewportHeight, width: viewportWidth },
    );
    applyPlacementSide(popup, placement.side);
    popup.style.left = `${placement.left}px`;
    popup.style.setProperty(
        "--wiked-lite-tooltip-tail-left",
        `${placement.tailLeft}px`,
    );
    if (placement.maxHeight < measuredHeight) {
        surface.style.maxHeight = `${placement.maxHeight}px`;
    }
    const renderedHeight = popup.offsetHeight;
    const top =
        placement.side === "above"
            ? anchor.top - ANCHOR_GAP - renderedHeight
            : anchor.bottom + ANCHOR_GAP;
    popup.style.top = `${top}px`;
}

function applyPlacementSide(
    popup: HTMLElement,
    side: ReferenceTooltipPlacement["side"],
): void {
    popup.classList.toggle("wiked-lite-tooltip--above", side === "above");
    popup.classList.toggle("wiked-lite-tooltip--below", side === "below");
}

function createTooltip(
    editor: HTMLElement,
    preview: ReferencePreview,
    onEnter: () => void,
    onLeave: () => void,
): HTMLElement {
    const target = editor.ownerDocument;
    const tooltip = target.createElement("aside");
    const surface = target.createElement("div");
    const tail = target.createElement("span");
    const body = target.createElement("div");
    tooltip.className = "wiked-lite-tooltip";
    tooltip.role = "note";
    surface.className = "wiked-lite-tooltip__surface";
    tail.className = "wiked-lite-tooltip__tail";
    body.className = "wiked-lite-tooltip__body";
    copyTooltipPresentation(editor, tooltip);
    surface.append(createTooltipTitle(target, preview));
    if (preview.noteText != null) {
        surface.append(createTooltipNote(target, preview.noteText));
    } else {
        for (const row of preview.rows) {
            body.append(createTooltipRow(target, row.fields));
        }
        surface.append(body);
    }
    tooltip.append(tail, surface);
    tooltip.addEventListener("pointerenter", onEnter);
    tooltip.addEventListener("pointerleave", onLeave);
    return tooltip;
}

function createTooltipNote(target: Document, text: string): HTMLElement {
    const note = target.createElement("div");
    note.className = "wiked-lite-tooltip__note";
    appendTooltipValue(target, note, { name: "", value: text });
    return note;
}

function copyTooltipPresentation(
    editor: HTMLElement,
    tooltip: HTMLElement,
): void {
    const view = editor.ownerDocument.defaultView;
    if (view == null) {
        return;
    }
    const style = view.getComputedStyle(editor);
    tooltip.style.setProperty("--wiked-lite-tooltip-foreground", style.color);
    tooltip.style.setProperty(
        "--wiked-lite-tooltip-background",
        style.backgroundColor,
    );
    const editorFontSize = Number.parseFloat(style.fontSize);
    if (Number.isFinite(editorFontSize)) {
        tooltip.style.fontSize = `${editorFontSize * 0.82}px`;
    }
}

function createTooltipRow(
    target: Document,
    fields: ReferencePreviewField[],
): HTMLElement {
    const row = target.createElement("div");
    row.className = "wiked-lite-tooltip__row";
    if (fields.length > 1) {
        row.classList.add("wiked-lite-tooltip__row--paired");
    }
    for (const field of fields) {
        const key = target.createElement("span");
        const value = target.createElement("span");
        key.className = "wiked-lite-tooltip__key";
        value.className = "wiked-lite-tooltip__value";
        key.textContent = field.name;
        appendTooltipValue(target, value, field);
        row.append(key, value);
    }
    return row;
}

function appendTooltipValue(
    target: Document,
    container: HTMLElement,
    field: ReferencePreviewField,
): void {
    const text = field.displayValue ?? field.value;
    if (field.href != null) {
        const link = createTooltipLink(target, field.href, text);
        if (link != null) {
            container.append(link);
            return;
        }
    }
    const pattern = /<!--[\s\S]*?-->|https?:\/\/[^\s<>{}\[\]|"']+/gu;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        container.append(
            target.createTextNode(text.slice(cursor, match.index)),
        );
        appendTooltipMatch(target, container, match[0]);
        cursor = match.index + match[0].length;
    }
    container.append(target.createTextNode(text.slice(cursor)));
}

function appendTooltipMatch(
    target: Document,
    container: HTMLElement,
    text: string,
): void {
    if (text.startsWith("<!--")) {
        const comment = target.createElement("span");
        comment.className = "wiked-lite-tooltip__comment";
        comment.textContent = text;
        container.append(comment);
        return;
    }
    container.append(
        createTooltipLink(target, text, text) ?? target.createTextNode(text),
    );
}

function createTooltipLink(
    target: Document,
    href: string,
    text: string,
): HTMLAnchorElement | null {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
    }
    const anchor = target.createElement("a");
    anchor.className = "wiked-lite-tooltip__link";
    anchor.href = url.href;
    anchor.rel = "noopener noreferrer";
    anchor.target = "_blank";
    anchor.textContent = text;
    return anchor;
}

function createTooltipTitle(
    target: Document,
    preview: ReferencePreview,
): HTMLElement {
    const title = target.createElement("div");
    title.className = "wiked-lite-tooltip__title";
    title.append(target.createTextNode(capitalize(preview.templateName)));
    if (preview.referenceLabel !== "") {
        const reference = target.createElement("span");
        reference.className = "wiked-lite-tooltip__reference";
        reference.textContent = ` (${preview.referenceLabel})`;
        title.append(reference);
    }
    return title;
}

function capitalize(value: string): string {
    return value.replace(/^./u, (character) => character.toLocaleUpperCase());
}

function findReferenceAnchor(
    editor: HTMLElement,
    eventTarget: EventTarget | null,
): HTMLElement | null {
    const element = eventElement(eventTarget);
    const anchor = element?.closest<HTMLElement>("[data-reference]") ?? null;
    return anchor != null && editor.contains(anchor) ? anchor : null;
}

function eventElement(target: EventTarget | null): Element | null {
    if (target == null || !("nodeType" in target)) {
        return null;
    }
    const node = target as Node;
    return node.nodeType === 1 ? (node as Element) : node.parentElement;
}

function sameReference(left: HTMLElement, right: HTMLElement | null): boolean {
    return right != null && left.dataset.reference === right.dataset.reference;
}

function normalizeDelay(value: number | undefined): number {
    if (value == null || !Number.isFinite(value)) {
        return DEFAULT_DELAY;
    }
    return clamp(value, 0, 5000);
}

function getDocumentView(target: Document): Window {
    const view = target.defaultView;
    if (view == null) {
        throw new Error("The editor document has no browsing context.");
    }
    return view;
}

function copyRect(rect: DOMRect): ReferenceTooltipRect {
    return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
    };
}

function isVisibleRect(
    rect: ReferenceTooltipRect,
    width: number,
    height: number,
): boolean {
    return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < height &&
        rect.left < width
    );
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}
