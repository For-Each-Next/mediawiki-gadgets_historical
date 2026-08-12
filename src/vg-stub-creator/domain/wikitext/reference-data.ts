/** Resolves values against keyed or ordered reference definitions. */

import { getWikilinkValue } from "#gadget/domain/wikitext/field-values.ts";

export type ReferenceAlias = string | RegExp;

/** Common identity fields supported by lookup reference data. */
export interface ReferenceDefinition {
    aliases?: Array<ReferenceAlias>;
    label?: string;
    page?: string;
}

/** A matched reference and its canonical collection key. */
export interface ReferenceEntry<
    Definition extends ReferenceDefinition = ReferenceDefinition,
> {
    key?: string;
    reference?: Definition;
}

type ReferenceDefinitions<Definition extends ReferenceDefinition> =
    Array<Definition> | Record<string, Definition> | null | undefined;

type ReferenceTuple<Definition extends ReferenceDefinition> = [
    string | undefined,
    Definition,
];

/** Flattens one array-valued property from matched reference data. */
export function getReferenceValues<Definition extends object>(
    references: Array<Definition>,
    key: string,
): Array<string> {
    return references.flatMap(function getValues(reference) {
        const values = Reflect.get(reference, key) as string[] | undefined;
        return values || [];
    });
}

/** Gets one reference definition by key, display name, or alias. */
export function getReferenceDefinition<Definition extends ReferenceDefinition>(
    definitions: ReferenceDefinitions<Definition>,
    value: string,
): Definition | undefined {
    return getReferenceEntry(definitions, value).reference;
}

/** Gets one reference entry by key, display name, or alias. */
export function getReferenceEntry<Definition extends ReferenceDefinition>(
    definitions: ReferenceDefinitions<Definition>,
    value: string,
): ReferenceEntry<Definition> {
    const entries = getReferenceEntries(definitions);
    const normalizedValue = normalizeAlias(getWikilinkValue(value));

    if (normalizedValue === "") {
        return {};
    }

    for (const [key, reference] of entries) {
        if (matchesReferenceEntry(key, reference, value, normalizedValue)) {
            return { key, reference };
        }
    }

    return {};
}

function matchesReferenceEntry<Definition extends ReferenceDefinition>(
    key: string | undefined,
    definition: Definition,
    value: string,
    normalizedValue: string,
): boolean {
    const names = [key, definition.page, definition.label];

    for (const name of names) {
        if (name != null && normalizeAlias(name) === normalizedValue) {
            return true;
        }
    }

    return hasMatchingReferenceAlias(definition.aliases, value);
}

function getReferenceEntries<Definition extends ReferenceDefinition>(
    definitions: ReferenceDefinitions<Definition>,
): Array<ReferenceTuple<Definition>> {
    if (Array.isArray(definitions)) {
        return definitions.map(function createEntry(
            definition: Definition,
        ): ReferenceTuple<Definition> {
            return [getReferenceKey(definition), definition];
        });
    }

    if (definitions == null) {
        return [];
    }

    return Object.entries(definitions);
}

function getReferenceKey(definition: ReferenceDefinition): string | undefined {
    return (
        definition.page ||
        definition.label ||
        definition.aliases?.find((alias) => typeof alias === "string")
    );
}

function hasMatchingReferenceAlias(
    aliases: Array<ReferenceAlias> | undefined,
    value: string,
): boolean {
    for (const alias of aliases || []) {
        if (matchesReferenceAlias(alias, value)) {
            return true;
        }
    }

    return false;
}

function matchesReferenceAlias(alias: ReferenceAlias, value: string): boolean {
    const unwrappedValue = getWikilinkValue(value);

    if (typeof alias === "string") {
        return normalizeAlias(alias) === normalizeAlias(unwrappedValue);
    }

    alias.lastIndex = 0;
    const match = alias.exec(unwrappedValue);
    return match?.[0] === unwrappedValue;
}

function normalizeAlias(alias: string): string {
    return alias.toLocaleLowerCase();
}
