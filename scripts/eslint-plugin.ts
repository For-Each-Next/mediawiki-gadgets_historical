/**
 * Defines repository-specific ESLint rules for TypeScript source style.
 */

import type { Rule } from "eslint";

/**
 * Reports return expressions that span multiple physical lines.
 *
 * @returns ESLint rule definition.
 */
function createNoMultilineReturnRule(): Rule.RuleModule {
    const rule: Rule.RuleModule = {
        create: createNoMultilineReturnListeners,
        meta: {
            docs: {
                description: "Disallow multiline return expressions.",
            },
            fixable: "code",
            schema: [],
            type: "suggestion",
        },
    };

    return rule;
}

/**
 * Creates listeners for multiline return expressions.
 *
 * @param context - Active ESLint rule context.
 * @returns Return-statement listener map.
 */
function createNoMultilineReturnListeners(
    context: Rule.RuleContext,
): Rule.RuleListener {
    const reservedByScope = new WeakMap<object, Set<string>>();
    const listeners: Rule.RuleListener = {
        ReturnStatement(node) {
            if (
                node.argument == null ||
                node.argument.loc.start.line === node.argument.loc.end.line
            ) {
                return;
            }

            const resultName = reserveResultName(
                context,
                node,
                reservedByScope,
            );

            context.report({
                fix(fixer) {
                    const expression = context.sourceCode.getText(
                        node.argument,
                    );
                    const indent = " ".repeat(node.loc.start.column);
                    const replacement = [
                        `const ${resultName} = ${expression};`,
                        `${indent}return ${resultName};`,
                    ].join("\n");

                    return fixer.replaceText(node, replacement);
                },
                message: "Multiline return expression.",
                node,
            });
        },
    };

    return listeners;
}

/**
 * Reserves an unused result variable name in a lexical scope.
 *
 * @param context - Active ESLint rule context.
 * @param node - Return statement being fixed.
 * @param reservedByScope - Names reserved by pending fixes.
 * @returns Collision-free result variable name.
 */
function reserveResultName(
    context: Rule.RuleContext,
    node: Rule.Node,
    reservedByScope: WeakMap<object, Set<string>>,
): string {
    const scope = context.sourceCode.getScope(node);
    let reserved = reservedByScope.get(scope);

    if (reserved == null) {
        reserved = new Set(scope.variables.map((variable) => variable.name));
        reservedByScope.set(scope, reserved);
    }

    let suffix = 1;
    let name = "result";

    while (reserved.has(name)) {
        suffix += 1;
        name = `result${suffix}`;
    }

    reserved.add(name);
    return name;
}

/**
 * Reports type annotations inside one-line arrow functions.
 *
 * @returns ESLint rule definition.
 */
function createNoTypedInlineArrowRule(): Rule.RuleModule {
    const rule: Rule.RuleModule = {
        create(context) {
            const listeners: Rule.RuleListener = {
                ArrowFunctionExpression(node) {
                    if (node.loc.start.line !== node.loc.end.line) {
                        return;
                    }

                    const annotation = node.params
                        .map(getTypeAnnotation)
                        .find(Boolean);

                    if (annotation != null) {
                        context.report({
                            fix(fixer) {
                                return fixer.remove(annotation);
                            },
                            message: "Type annotation in a one-line arrow.",
                            node: annotation,
                        });
                    }
                },
            };

            return listeners;
        },
        meta: {
            docs: {
                description: "Disallow typed one-line arrow parameters.",
            },
            fixable: "code",
            schema: [],
            type: "suggestion",
        },
    };

    return rule;
}

/**
 * Gets a parameter's explicit type annotation.
 *
 * @param parameter - Arrow-function parameter node.
 * @returns Type annotation node when one is present.
 */
function getTypeAnnotation<T extends object>(
    parameter: T,
): Rule.Node | undefined {
    if (!("typeAnnotation" in parameter)) {
        return undefined;
    }

    return parameter.typeAnnotation as Rule.Node | undefined;
}

/**
 * Exposes repository-specific lint rules.
 */
const localPlugin = {
    rules: {
        "no-multiline-return": createNoMultilineReturnRule(),
        "no-typed-inline-arrow": createNoTypedInlineArrowRule(),
    },
};

export default localPlugin;
