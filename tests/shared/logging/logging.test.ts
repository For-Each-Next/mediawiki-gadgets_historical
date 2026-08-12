/** Tests shared structured gadget logging. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createLogger,
    type LogOutput,
    type LoggingConfig,
} from "@mediawiki-gadgets/shared/logging";

interface LogCall {
    level: keyof LogOutput;
    values: unknown[];
}

interface RuntimeConfiguration {
    mediaWikiGadgetsConfig?: { logging?: LoggingConfig };
}

function createOutput(): { calls: LogCall[]; output: LogOutput } {
    const calls: LogCall[] = [];
    const record = (level: keyof LogOutput, values: unknown[]) => {
        calls.push({ level, values });
    };
    return {
        calls,
        output: {
            debug: (...values) => record("debug", values),
            error: (...values) => record("error", values),
            info: (...values) => record("info", values),
            warn: (...values) => record("warn", values),
        },
    };
}

test("defaults to warning output with stable event names", () => {
    const { calls, output } = createOutput();
    const logger = createLogger("VG Page Assessor", { output });

    logger.debug("page.fetch.started");
    logger.info("page.fetch.ready");
    logger.warn("Page fetch failed!");
    logger.error("page.save.failed", { status: 503 });

    assert.deepEqual(calls, [
        {
            level: "warn",
            values: [
                "[mediawiki-gadgets][vg-page-assessor] " + "page.fetch.failed",
            ],
        },
        {
            level: "error",
            values: [
                "[mediawiki-gadgets][vg-page-assessor] page.save.failed",
                { status: 503 },
            ],
        },
    ]);
});

test("resolves option, gadget, common, and default level precedence", () => {
    const runtime = globalThis as typeof globalThis & RuntimeConfiguration;
    runtime.mediaWikiGadgetsConfig = {
        logging: {
            gadgets: { alpha: "debug", beta: "silent", "mixed-case": "info" },
            level: "error",
        },
    };
    const fixture = createOutput();

    assert.equal(
        createLogger("alpha", { output: fixture.output }).isEnabled("debug"),
        true,
    );
    assert.equal(
        createLogger("beta", { output: fixture.output }).isEnabled("error"),
        false,
    );
    assert.equal(
        createLogger("gamma", { output: fixture.output }).isEnabled("warn"),
        false,
    );
    assert.equal(
        createLogger("gamma", {
            level: "info",
            output: fixture.output,
        }).isEnabled("info"),
        true,
    );
    assert.equal(
        createLogger("Mixed Case", {
            output: fixture.output,
        }).isEnabled("info"),
        true,
    );
    delete runtime.mediaWikiGadgetsConfig;
});

test("creates nested scopes without changing the parent", () => {
    const { calls, output } = createOutput();
    const logger = createLogger("wikEd Lite", { level: "info", output });

    logger.child("MediaWiki API").child("Titles").info("lookup.ready");
    logger.info("startup.ready");

    assert.deepEqual(calls, [
        {
            level: "info",
            values: [
                "[mediawiki-gadgets][wiked-lite]" +
                    "[mediawiki-api.titles] lookup.ready",
            ],
        },
        {
            level: "info",
            values: ["[mediawiki-gadgets][wiked-lite] startup.ready"],
        },
    ]);
});

test("redacts and bounds diagnostic details", () => {
    const { calls, output } = createOutput();
    const logger = createLogger("citation-formatter", {
        level: "debug",
        output,
    });
    const details: Record<string, unknown> = {
        error: new Error("Failed at https://example.test/private?q=token"),
        nested: { ok: true, password: "secret", sourceText: "article" },
        requestUrl: "https://example.test/?token=secret",
        values: Array.from({ length: 25 }, (_value, index) => index),
    };
    details.circular = details;

    logger.debug("request.failed", details);

    const sanitized = calls[0].values[1] as Record<string, unknown>;
    assert.deepEqual(sanitized.error, {
        message: "[redacted]",
        name: "Error",
    });
    assert.deepEqual(sanitized.nested, {
        ok: true,
        password: "[redacted]",
        sourceText: "[redacted]",
    });
    assert.equal(sanitized.requestUrl, "[redacted]");
    assert.equal(sanitized.circular, "[circular]");
    assert.equal((sanitized.values as unknown[]).at(-1), "[truncated]");
});

test("does not let hostile diagnostic values break the caller", () => {
    const { calls, output } = createOutput();
    const logger = createLogger("citation-formatter", { output });
    const details = new Proxy(
        {},
        {
            ownKeys() {
                throw new Error("unreadable");
            },
        },
    );

    assert.doesNotThrow(() => logger.warn("request.failed", details));
    assert.equal(calls[0].values[1], "[unavailable]");
});

test("records an idempotent debug timer", () => {
    const { calls, output } = createOutput();
    const times = [100, 112, 140];
    const logger = createLogger("vg-stub-creator", {
        level: "debug",
        now: () => times.shift() ?? 140,
        output,
    });
    const stop = logger.startTimer("article.save", { operation: "create" });

    stop({ outcome: "success" });
    stop({ outcome: "duplicate" });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].values, [
        "[mediawiki-gadgets][vg-stub-creator] article.save.completed",
        {
            completion: { outcome: "success" },
            durationMs: 12,
            initial: { operation: "create" },
        },
    ]);
});

test("does not sample a disabled debug timer", () => {
    const { calls, output } = createOutput();
    let samples = 0;
    const logger = createLogger("citation-formatter", {
        now() {
            samples += 1;
            return samples;
        },
        output,
    });

    const stop = logger.startTimer("article.format");
    stop();

    assert.equal(samples, 0);
    assert.deepEqual(calls, []);
});

test("redacts page titles and email addresses and keeps error codes", () => {
    const { calls, output } = createOutput();
    const logger = createLogger("vg-page-assessor", {
        level: "debug",
        output,
    });
    const error = Object.assign(new Error("request rejected"), {
        code: "badtoken",
    });

    logger.debug("page.fetch.failed", {
        email: "person@example.test",
        error,
        title: "Private draft",
    });

    assert.deepEqual(calls[0].values[1], {
        email: "[redacted]",
        error: {
            code: "badtoken",
            message: "[redacted]",
            name: "Error",
        },
        title: "[redacted]",
    });
});
