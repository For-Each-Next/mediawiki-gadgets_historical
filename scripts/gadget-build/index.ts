/**
 * Exposes the shared gadget builder's public operations.
 */

export { findArtifactCollisions, type ArtifactClaim } from "./artifacts.ts";
export { buildGadget } from "./build.ts";
export { extractVueTemplate, minifyHtmlTemplate } from "./html-templates.ts";
