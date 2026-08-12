/** Tests shared locale resolution and named interpolation. */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createI18n,
    createTranslator,
    resolveLocale,
} from "@mediawiki-gadgets/shared/i18n";

const english = {
    greeting: "Hello, {name}.",
    rich: "Open {link} now.",
};

test("resolves exact, Chinese variant, base, and English locales", () => {
    const locales = ["en", "fr", "zh-Hans", "zh-Hant"];

    assert.equal(resolveLocale("FR", locales), "fr");
    assert.equal(resolveLocale("zh_CN", locales), "zh-Hans");
    assert.equal(resolveLocale("zh-TW", locales), "zh-Hant");
    assert.equal(resolveLocale("fr-CA", locales), "fr");
    assert.equal(resolveLocale("de", locales), "en");
});

test("interpolates text and preserves typed rich message parts", () => {
    const translator = createTranslator({ en: english }, "en");
    const link = { href: "/wiki/Example" };

    assert.equal(
        translator.text("greeting", { name: "Editor" }),
        "Hello, Editor.",
    );
    assert.deepEqual(translator.parts("rich", { link }), [
        "Open ",
        link,
        " now.",
    ]);
});

test("creates a catalog-keyed typed facade", () => {
    const i18n = createI18n(english, {
        fr: { greeting: "Bonjour, {name}.", rich: "Ouvrir {link}." },
    });

    assert.equal(typeof i18n.msg("greeting", { name: "Editor" }), "string");
    assert.equal(typeof i18n.interfaceLocale, "string");
});
