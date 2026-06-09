/**
 * Tests missing-page action triggers.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { addMissingPageEditTrigger } from "../src/page-trigger.js";

test("addMissingPageEditTrigger adds an action beside #ca-edit", () => {
  const listeners = [];
  const inserted = [];
  const editItem = {
    nextSibling: {
      id: "next",
    },
    parentNode: {
      insertBefore(item, sibling) {
        inserted.push([item, sibling]);
      },
    },
  };
  const elements = [];
  const document = {
    createElement(tagName) {
      const element = {
        append(child) {
          this.child = child;
        },
        tagName,
      };

      if (tagName === "a") {
        element.addEventListener = (type, handler) => {
          listeners.push([type, handler]);
        };
      }

      elements.push(element);
      return element;
    },
    querySelector(selector) {
      assert.equal(selector, "#ca-edit");
      return editItem;
    },
  };
  const handler = () => {};
  const updated = addMissingPageEditTrigger(document, handler);
  const [item, link] = elements;

  assert.equal(updated, true);
  assert.equal(item.id, "ca-create-vg-stub");
  assert.equal(item.child, link);
  assert.equal(link.href, "#");
  assert.equal(link.textContent, "Create video game stub");
  assert.deepEqual(listeners, [["click", handler]]);
  assert.deepEqual(inserted, [[item, editItem.nextSibling]]);
});

test("addMissingPageEditTrigger skips pages without #ca-edit", () => {
  const updated = addMissingPageEditTrigger(
    {
      querySelector() {
        return null;
      },
    },
    () => {},
  );

  assert.equal(updated, false);
});
