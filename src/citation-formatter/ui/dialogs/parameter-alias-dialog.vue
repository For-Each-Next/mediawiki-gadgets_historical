<template>
    <cdx-dialog
        v-model:open="parameterAliasDialogOpen"
        class="cf-source-manager__parameter-alias-dialog"
        :title="msg('draft.alias')"
        :lang="interfaceLocale"
        @update:open="onParameterAliasDialogOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
            <div class="cf-source-manager__parameter-alias-fields">
                <cdx-field>
                    <template #label>
                        {{ getParameterAliasOriginalValueLabel() }}
                    </template>
                    <template #description>
                        {{ msg("draft.originalValueDescription") }}
                    </template>
                    <cdx-text-area
                        v-model="parameterAliasDialogOriginalValue"
                        :autosize="true"
                        rows="1"
                        :status="
                            getParameterAliasDialogError()
                                ? 'error'
                                : 'default'
                        "
                        :aria-label="getParameterAliasOriginalValueLabel()"
                    />
                </cdx-field>
                <cdx-field>
                    <template #label>
                        {{ getParameterAliasDialogLabel() }}
                    </template>
                    <template #description>
                        {{ msg("draft.aliasDialogDescription") }}
                    </template>
                    <cdx-text-area
                        v-model="parameterAliasDialogValue"
                        :autosize="true"
                        rows="1"
                        :aria-label="getParameterAliasDialogLabel()"
                        autofocus
                    />
                </cdx-field>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("draft.directives") }}
                    </template>
                    <template #description>
                        {{ msg("draft.directivesDescription") }}
                    </template>
                    <cdx-checkbox
                        v-model="parameterAliasDialogDirectives"
                        input-value="!no-author"
                    >
                        <code>!no-author</code>
                        — {{ msg("draft.noAuthorDirective") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="parameterAliasDialogDirectives"
                        input-value="!no-date"
                    >
                        <code>!no-date</code>
                        — {{ msg("draft.noDateDirective") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="parameterAliasDialogDirectives"
                        input-value="!no-part"
                    >
                        <code>!no-part</code>
                        — {{ msg("draft.noPartDirective") }}
                    </cdx-checkbox>
                </cdx-field>
            </div>
            <small
                v-if="getParameterAliasDialogError()"
                class="cf-source-manager__field-error"
            >
                {{ getParameterAliasDialogError() }}
            </small>
        </div>
        <template #footer>
            <div class="cf-source-manager__footer-actions">
                <cdx-button
                    action="progressive"
                    weight="primary"
                    :disabled="loading || !canApplyParameterAlias()"
                    @click="applyParameterAlias"
                >
                    {{ msg("common.save") }}
                </cdx-button>
                <cdx-button
                    action="destructive"
                    weight="quiet"
                    @click="closeParameterAliasDialog"
                >
                    {{ msg("common.cancel") }}
                </cdx-button>
            </div>
        </template>
    </cdx-dialog>
</template>
