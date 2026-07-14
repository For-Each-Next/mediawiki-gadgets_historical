/**
 * Tests MediaWiki edit-form submission helpers.
 */

import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
    hasEditText,
    interceptEditSave,
    readEditSummary,
    readEditText,
    shouldPreserveEditor,
    submitEditForm,
    submitPreviewForm,
} from "../../src/vg-stub-creator/editing/editor.ts";

const testGlobal = globalThis as any;
const originalDocument = testGlobal.document;

afterEach(() => {
    testGlobal.document = originalDocument;
});

test("readEditText returns manually edited wikitext", () => {
    testGlobal.document = {
        getElementById(id) {
            return id === "wpTextbox1"
                ? {
                      value: "{{cite web|title=Manually fixed}}",
                  }
                : null;
        },
    };

    assert.equal(readEditText(), "{{cite web|title=Manually fixed}}");
    assert.equal(hasEditText(), true);
});

test("readEditSummary returns a manually edited summary", () => {
    testGlobal.document = {
        getElementById(id) {
            return id === "wpSummary"
                ? {
                      value: "Manual summary",
                  }
                : null;
        },
    };

    assert.equal(readEditSummary(), "Manual summary");
});

test("hasEditText is false only for an empty editor", () => {
    testGlobal.document = {
        getElementById() {
            return {
                value: "",
            };
        },
    };

    assert.equal(hasEditText(), false);
});

test("shouldPreserveEditor protects nonempty editor content", () => {
    testGlobal.document = {
        getElementById(id) {
            return {
                editform: {},
                wpTextbox1: {
                    value: "Manual changes",
                },
            }[id];
        },
    };

    assert.equal(shouldPreserveEditor(), true);
});

test("shouldPreserveEditor allows generation for an empty editor", () => {
    testGlobal.document = {
        getElementById(id) {
            return {
                editform: {},
                wpTextbox1: {
                    value: "",
                },
            }[id];
        },
    };

    assert.equal(shouldPreserveEditor(), false);
});

test("interceptEditSave routes native saves through review", () => {
    const { editForm, saveButton } = createEditForm();
    let reviewCount = 0;

    testGlobal.document = createDocument(editForm);
    interceptEditSave(() => {
        reviewCount += 1;
    });
    editForm.requestSubmit(saveButton);

    assert.equal(reviewCount, 1);
    assert.equal(editForm.submissions.length, 0);
});

test("interceptEditSave routes default submissions through review", () => {
    const { editForm } = createEditForm();
    let reviewCount = 0;

    testGlobal.document = createDocument(editForm);
    interceptEditSave(() => {
        reviewCount += 1;
    });
    editForm.requestSubmit();

    assert.equal(reviewCount, 1);
    assert.equal(editForm.submissions.length, 0);
});

test("interceptEditSave allows preview submissions", () => {
    const { editForm, previewButton } = createEditForm();
    let reviewCount = 0;

    testGlobal.document = createDocument(editForm);
    interceptEditSave(() => {
        reviewCount += 1;
    });
    submitPreviewForm();

    assert.equal(reviewCount, 0);
    assert.deepEqual(editForm.submissions, [previewButton]);
});

test("submitEditForm authorizes one reviewed save", () => {
    const { editForm, saveButton } = createEditForm();
    let reviewCount = 0;

    testGlobal.document = createDocument(editForm);
    interceptEditSave(() => {
        reviewCount += 1;
    });
    submitEditForm();
    editForm.requestSubmit(saveButton);

    assert.equal(reviewCount, 1);
    assert.deepEqual(editForm.submissions, [saveButton]);
});

function createDocument(editForm): any {
    return {
        getElementById(id) {
            return {
                editform: editForm,
                wpPreview: editForm.previewButton,
                wpSave: editForm.saveButton,
            }[id];
        },
    };
}

function createEditForm(): any {
    const listeners = [];
    const saveButton = { id: "wpSave" };
    const previewButton = { id: "wpPreview" };
    const editForm = {
        previewButton,
        saveButton,
        submissions: [],
        addEventListener(type, listener) {
            assert.equal(type, "submit");
            listeners.push(listener);
        },
        removeEventListener(type, listener) {
            assert.equal(type, "submit");
            const index = listeners.indexOf(listener);

            if (index >= 0) {
                listeners.splice(index, 1);
            }
        },
        requestSubmit(submitter?) {
            let prevented = false;
            const event = {
                preventDefault() {
                    prevented = true;
                },
                stopImmediatePropagation() {},
                submitter,
            };

            listeners.forEach((listener) => listener(event));

            if (!prevented) {
                this.submissions.push(submitter);
            }
        },
    };

    return { editForm, previewButton, saveButton };
}
