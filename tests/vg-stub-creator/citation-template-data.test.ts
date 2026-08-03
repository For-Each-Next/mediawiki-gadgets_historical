/** Tests bundled citation TemplateData title normalization. */

import assert from "node:assert/strict";
import test from "node:test";

// prettier-ignore
import {
    getCitationTemplateData,
} from "vg-stub-creator/domain/citations/data/templates.ts";

test("recognizes zhwiki template namespace aliases", () => {
    const canonical = getCitationTemplateData("Cite web");

    assert.ok(canonical != null);
    assert.equal(getCitationTemplateData("T:Cite_web"), canonical);
    assert.equal(getCitationTemplateData("樣板:Cite web"), canonical);
    assert.equal(getCitationTemplateData("TM:Cite web"), undefined);
});
