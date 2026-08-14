/** Live editor behaviors controlled by persisted formatter settings. */

import type * as settings from "#gadget/domain/formatter-settings.ts";

type EditorFeatureSettings = settings.EditorFeatureSettings;

export interface MissingLinkResult {
    linkClasses: string[];
    titles: Set<string>;
}

export interface EditorFeatureController {
    destroy(): void;
    getReferenceFallbackSource(): string | null;
    getSettings(): EditorFeatureSettings;
    setSettings(settings: EditorFeatureSettings): void;
    sourceChanged(): void;
}

export interface EditorFeatureOptions {
    delay?: number;
    findMissingLinks(source: string): Promise<MissingLinkResult>;
    getSource(): string;
    initialSettings: EditorFeatureSettings;
    loadPageSource(): Promise<string>;
    onError(error: unknown, operation: "links" | "page-source"): void;
    onMissingLinks(result: MissingLinkResult): void;
    onReferencePreviews(enabled: boolean): void;
    sectionEditing: boolean;
    timer?: EditorFeatureTimer;
}

export interface EditorFeatureTimer {
    clear(handle: number): void;
    set(callback: () => void, delay: number): number;
}

const DEFAULT_LOOKUP_DELAY = 500;

/** Coordinates optional network-backed editor features. */
export function createEditorFeatureController(
    options: EditorFeatureOptions,
): EditorFeatureController {
    return new EditorFeatureCoordinator(options);
}

class EditorFeatureCoordinator implements EditorFeatureController {
    private destroyed = false;
    private lookupGeneration = 0;
    private lookupTimer = 0;
    private readonly options: EditorFeatureOptions;
    private pageSource: string | null = null;
    private pageSourceRequest: Promise<void> | null = null;
    private settings: EditorFeatureSettings;
    private readonly timer: EditorFeatureTimer;

    constructor(options: EditorFeatureOptions) {
        this.options = options;
        this.timer = options.timer ?? createWindowTimer();
        this.settings = { ...options.initialSettings };
        options.onReferencePreviews(this.settings.referencePreviews);
        if (this.settings.highlightMissing) {
            this.scheduleLookup(0);
        }
        if (this.settings.fullPageReferencePreviews) {
            this.requestPageSource();
        }
    }

    destroy(): void {
        this.destroyed = true;
        this.cancelLookup();
    }

    getReferenceFallbackSource(): string | null {
        return this.settings.fullPageReferencePreviews
            ? this.pageSource
            : null;
    }

    getSettings(): EditorFeatureSettings {
        return { ...this.settings };
    }

    setSettings(next: EditorFeatureSettings): void {
        if (this.destroyed) {
            return;
        }
        const previous = this.settings;
        this.settings = { ...next };
        if (previous.referencePreviews !== this.settings.referencePreviews) {
            this.options.onReferencePreviews(this.settings.referencePreviews);
        }
        this.updateMissingLinkSetting(previous.highlightMissing);
        if (
            this.settings.fullPageReferencePreviews &&
            !previous.fullPageReferencePreviews
        ) {
            this.requestPageSource();
        }
    }

    sourceChanged(): void {
        if (!this.destroyed && this.settings.highlightMissing) {
            this.scheduleLookup(this.options.delay ?? DEFAULT_LOOKUP_DELAY);
        }
    }

    private cancelLookup(): void {
        this.lookupGeneration += 1;
        this.timer.clear(this.lookupTimer);
        this.lookupTimer = 0;
    }

    private isCurrentLookup(source: string, generation: number): boolean {
        return (
            !this.destroyed &&
            this.settings.highlightMissing &&
            generation === this.lookupGeneration &&
            source === this.options.getSource()
        );
    }

    private requestPageSource(): void {
        if (!this.shouldRequestPageSource()) {
            return;
        }
        this.pageSourceRequest = this.options
            .loadPageSource()
            .then((source) => this.rememberPageSource(source))
            .catch((error) => this.reportPageSourceError(error))
            .finally(() => this.completePageSourceRequest());
    }

    private runLookup(source: string, generation: number): void {
        void this.options.findMissingLinks(source).then(
            (result) => this.acceptLookup(source, generation, result),
            (error: unknown) =>
                this.reportLookupError(source, generation, error),
        );
    }

    private scheduleLookup(delay: number): void {
        this.cancelLookup();
        const generation = this.lookupGeneration;
        const source = this.options.getSource();
        this.lookupTimer = this.timer.set(() => {
            this.lookupTimer = 0;
            this.runLookup(source, generation);
        }, delay);
    }

    private shouldRequestPageSource(): boolean {
        return (
            !this.destroyed &&
            this.options.sectionEditing &&
            this.pageSource == null &&
            this.pageSourceRequest == null
        );
    }

    private rememberPageSource(source: string): void {
        if (!this.destroyed) {
            this.pageSource = source;
        }
    }

    private acceptLookup(
        source: string,
        generation: number,
        result: MissingLinkResult,
    ): void {
        if (this.isCurrentLookup(source, generation)) {
            this.options.onMissingLinks(result);
        }
    }

    private completePageSourceRequest(): void {
        this.pageSourceRequest = null;
    }

    private reportLookupError(
        source: string,
        generation: number,
        error: unknown,
    ): void {
        if (this.isCurrentLookup(source, generation)) {
            this.options.onError(error, "links");
        }
    }

    private reportPageSourceError(error: unknown): void {
        if (!this.destroyed && this.settings.fullPageReferencePreviews) {
            this.options.onError(error, "page-source");
        }
    }

    private updateMissingLinkSetting(wasEnabled: boolean): void {
        if (!this.settings.highlightMissing && wasEnabled) {
            this.cancelLookup();
            this.options.onMissingLinks({
                linkClasses: [],
                titles: new Set(),
            });
        } else if (this.settings.highlightMissing && !wasEnabled) {
            this.scheduleLookup(0);
        }
    }
}

function createWindowTimer(): EditorFeatureTimer {
    return {
        clear: (handle) => window.clearTimeout(handle),
        set: (callback, delay) => window.setTimeout(callback, delay),
    };
}
