/* eslint-disable */

/**
 * Registers all article data-flow modules in deterministic order.
 */

import { additionalProseModule } from "./additional-prose.js";
import { companiesModule } from "./companies.js";
import { genreModule } from "./genre.js";
import { namesModule } from "./names.js";
import { platformModule } from "./platform.js";
import { reviewModule } from "./review.js";
import { scoresModule } from "./scores.js";
import { seriesModule } from "./series.js";
import { yearModule } from "./year.js";

export const ARTICLE_MODULES = Object.freeze([
    namesModule,
    yearModule,
    genreModule,
    companiesModule,
    platformModule,
    seriesModule,
    scoresModule,
    additionalProseModule,
    reviewModule,
]);
