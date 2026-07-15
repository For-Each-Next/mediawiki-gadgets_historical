/**
 * Registers all article data-flow modules in deterministic order.
 */

import { additionalProseModule } from "./additional-prose.ts";
import { companiesModule } from "./companies.ts";
import { genreModule } from "./genre.ts";
import { namesModule } from "./names.ts";
import { noteTaModule } from "./note-ta.ts";
import { platformModule } from "./platform.ts";
import { reviewModule } from "./review.ts";
import { scoresModule } from "./scores.ts";
import { seriesModule } from "./series.ts";
import { yearModule } from "./year.ts";

export const ARTICLE_MODULES = Object.freeze([
    namesModule,
    yearModule,
    genreModule,
    companiesModule,
    platformModule,
    seriesModule,
    scoresModule,
    noteTaModule,
    additionalProseModule,
    reviewModule,
]);
