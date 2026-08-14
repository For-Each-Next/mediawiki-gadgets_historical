/** Formatter-action failure behavior at the ResourceLoader boundary. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createLogger,
    type LogOutput,
} from "@mediawiki-gadgets/shared/logging";
// eslint-disable-next-line max-len
import type { ActionNotification } from "@mediawiki-gadgets/shared/mediawiki/notifications";
import type { EditorServices } from "wiked-lite/contracts/editor.ts";
// eslint-disable-next-line max-len
import { createDefaultFormatterSettings } from "wiked-lite/domain/formatter-settings.ts";
import { openFormatter } from "wiked-lite/ui/editor.ts";

test(
    "reports rejected formatter dialog loads through injected ports",
    reportFormatterLoadFailure,
);

async function reportFormatterLoadFailure(): Promise<void> {
    const errors: unknown[][] = [];
    const notifications: ActionNotification[] = [];
    const requestedModules: string[][] = [];
    const restore = installFormatterEnvironment(requestedModules);
    const services = createServices(errors, notifications);

    try {
        await assert.doesNotReject(() => openFormatter(services));
    } finally {
        restore();
    }

    assert.deepEqual(requestedModules, [["vue", "@wikimedia/codex"]]);
    assert.match(
        String(errors[0]?.[0]),
        /\[wiked-lite-test\] dialog\.open\.failed$/u,
    );
    assert.deepEqual(notifications, [
        {
            key: "dialog-open-failed",
            message: "Wikitext formatter could not open. Try again.",
            type: "error",
        },
    ]);
}

function createServices(
    errors: unknown[][],
    notifications: ActionNotification[],
): EditorServices {
    return {
        async findMissingLinks() {
            return { linkClasses: [], titles: new Set() };
        },
        getHighlightOptions() {
            return {};
        },
        isSectionEditing: () => false,
        loadFormatterSettings: createDefaultFormatterSettings,
        async loadNamespaces() {},
        async loadPageSource() {
            return "";
        },
        logger: createLogger("wiked-lite-test", {
            level: "error",
            output: createLogOutput(errors),
        }),
        notify(notification) {
            notifications.push(notification);
        },
        async resolveRedirects(source) {
            return source;
        },
        saveFormatterSettings() {},
    };
}

function installFormatterEnvironment(
    requestedModules: string[][],
): () => void {
    class FakeTextArea {
        readonly marker = "textarea";
    }

    const textarea = new FakeTextArea();
    const properties = ["document", "HTMLTextAreaElement", "mw"] as const;
    const originals = captureGlobals(properties);
    installFormatterGlobals(FakeTextArea, textarea, requestedModules);
    return () => restoreGlobals(properties, originals);
}

function installFormatterGlobals(
    TextArea: new () => object,
    textarea: object,
    requestedModules: string[][],
): void {
    Object.defineProperty(globalThis, "HTMLTextAreaElement", {
        configurable: true,
        value: TextArea,
    });
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
            getElementById() {
                return textarea;
            },
        },
    });
    Object.defineProperty(globalThis, "mw", {
        configurable: true,
        value: {
            loader: {
                using(modules: string[]) {
                    requestedModules.push(modules);
                    return Promise.reject(new Error("Codex unavailable"));
                },
            },
        },
    });
}

function captureGlobals<const Name extends PropertyKey>(
    properties: readonly Name[],
): Map<Name, PropertyDescriptor | undefined> {
    return new Map(
        properties.map((name) => [
            name,
            Object.getOwnPropertyDescriptor(globalThis, name),
        ]),
    );
}

function restoreGlobals<const Name extends PropertyKey>(
    properties: readonly Name[],
    originals: ReadonlyMap<Name, PropertyDescriptor | undefined>,
): void {
    for (const name of properties) {
        const descriptor = originals.get(name);
        if (descriptor == null) {
            Reflect.deleteProperty(globalThis, name);
        } else {
            Object.defineProperty(globalThis, name, descriptor);
        }
    }
}

function createLogOutput(errors: unknown[][]): LogOutput {
    return {
        debug() {},
        error(...values) {
            errors.push(values);
        },
        info() {},
        warn() {},
    };
}
