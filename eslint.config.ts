/**
 * Configures lint rules for gadget source and scripts.
 */

import tsParser from "@typescript-eslint/parser";

const typescriptFiles = [
    "config/**/*.ts",
    "src/**/*.ts",
    "scripts/**/*.ts",
    "tests/**/*.ts",
];
const browserFiles = ["src/**/*.ts"];
const nodeFiles = ["config/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts"];

const browserGlobals = {
    AbortController: "readonly",
    Blob: "readonly",
    CustomEvent: "readonly",
    DocumentFragment: "readonly",
    DOMParser: "readonly",
    Element: "readonly",
    Event: "readonly",
    FormData: "readonly",
    Headers: "readonly",
    HTMLDialogElement: "readonly",
    HTMLElement: "readonly",
    IntersectionObserver: "readonly",
    MutationObserver: "readonly",
    Node: "readonly",
    Promise: "readonly",
    Request: "readonly",
    Response: "readonly",
    URL: "readonly",
    URLSearchParams: "readonly",
    XMLSerializer: "readonly",
    clearInterval: "readonly",
    clearTimeout: "readonly",
    console: "readonly",
    document: "readonly",
    fetch: "readonly",
    history: "readonly",
    localStorage: "readonly",
    location: "readonly",
    navigator: "readonly",
    queueMicrotask: "readonly",
    sessionStorage: "readonly",
    setInterval: "readonly",
    setTimeout: "readonly",
    window: "readonly",
};

const mediaWikiGlobals = {
    mw: "readonly",
};

const nodeGlobals = {
    Buffer: "readonly",
    console: "readonly",
    fetch: "readonly",
    globalThis: "readonly",
    process: "readonly",
    structuredClone: "readonly",
};

export default [
    {
        ignores: ["**/node_modules/**", "**/dist/**", "**/.cache/**"],
    },
    {
        files: typescriptFiles,
        languageOptions: {
            ecmaVersion: "latest",
            parser: tsParser,
            sourceType: "module",
        },
        linterOptions: {
            reportUnusedDisableDirectives: "error",
            reportUnusedInlineConfigs: "error",
        },
        rules: {
            curly: ["error", "all"],
            eqeqeq: ["error", "always", { null: "ignore" }],
            "no-constant-condition": "error",
            "no-duplicate-imports": "error",
            "no-eval": "error",
            "no-inner-declarations": "error",
            "no-new-func": "error",
            "no-unreachable": "error",
            "no-var": "error",
            "prefer-const": "error",
        },
    },
    {
        files: browserFiles,
        languageOptions: {
            globals: {
                ...browserGlobals,
                ...mediaWikiGlobals,
            },
        },
    },
    {
        files: nodeFiles,
        languageOptions: {
            globals: nodeGlobals,
        },
    },
    {
        files: typescriptFiles,
        rules: {
            "max-depth": ["error", 4],
            "max-len": [
                "error",
                {
                    code: 79,
                    comments: 72,
                    ignoreRegExpLiterals: false,
                    ignoreStrings: false,
                    ignoreTemplateLiterals: false,
                    ignoreUrls: false,
                    tabWidth: 4,
                },
            ],
            "max-lines-per-function": [
                "error",
                {
                    IIFEs: true,
                    max: 40,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
            "max-params": ["error", 5],
        },
    },
];
