/* eslint-disable */

/**
 * Registers all article data-flow modules in deterministic order.
 */

import { additionalProsePart } from "./additional-prose.js";
import { companiesPart } from "./companies.js";
import { genrePart } from "./genre.js";
import { namesPart } from "./names.js";
import { platformPart } from "./platform.js";
import { reviewPart } from "./review.js";
import { scoresPart } from "./scores.js";
import { seriesPart } from "./series.js";
import { yearPart } from "./year.js";

export const ARTICLE_PARTS = Object.freeze([
    namesPart,
    yearPart,
    genrePart,
    companiesPart,
    platformPart,
    seriesPart,
    scoresPart,
    additionalProsePart,
    reviewPart,
]);
