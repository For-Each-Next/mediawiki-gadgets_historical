/**
 * Applies Stylelint's recommended correctness rules to gadget stylesheets.
 */

export default {
    extends: ["stylelint-config-recommended"],
    rules: {
        "declaration-property-value-keyword-no-deprecated": null,
        "no-descending-specificity": null,
    },
};
