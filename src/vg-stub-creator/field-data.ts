/**
 * Collects the static field data used by the stub creator.
 */

import citationRules from "./sources/citation-rules.ts";
import citationTemplate from "./sources/citation-template.ts";
import companies from "./terminologies/companies.ts";
import genres from "./terminologies/genres.ts";
import platforms from "./terminologies/platforms.ts";
import years from "./terminologies/years.ts";
import wikitext from "./wikitext/wikitext.ts";

const fieldData = {
    "citation-rules": citationRules,
    "citation-template": citationTemplate,
    companies,
    genres,
    platforms,
    wikitext,
    years,
};

export default fieldData;
