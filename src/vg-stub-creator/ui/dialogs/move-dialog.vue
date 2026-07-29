<template>
    <cdx-dialog v-model:open="moveOpen" :title="msg('form.moveTitle')">
        <cdx-message
            class="vg-stub-creator-message"
            type="notice"
            v-if="movePreviewConfirmation"
        >
            {{ msg("form.movePrompt") }}
        </cdx-message>
        <cdx-message
            class="vg-stub-creator-message"
            type="warning"
            v-if="moveTargetState.exists"
        >
            {{ msg("form.moveConflict") }}
        </cdx-message>
        <cdx-field>
            <cdx-text-input
                :placeholder="msg('text.pageNamePlaceholder')"
                v-bind:model-value="moveTarget"
                v-on:update:model-value="updateMoveTarget($event)"
            ></cdx-text-input>
            <template v-slot:label>{{ msg("text.pageName") }}</template>
        </cdx-field>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="sourceFetchState.error"
        >
            {{ sourceFetchState.error }}
        </cdx-message>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="closeMoveDialog"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="previewWithoutMoving"
                        v-bind:disabled="
                            sourceFetchState.loading || moveTargetState.loading
                        "
                        v-if="movePreviewConfirmation"
                        weight="quiet"
                    >
                        {{ msg("text.previewWithoutMoving") }}
                    </cdx-button>
                    <cdx-button
                        type="button"
                        v-on:click="submitMoveTarget"
                        action="progressive"
                        v-bind:disabled="
                            sourceFetchState.loading || moveTargetState.loading
                        "
                        weight="primary"
                    >
                        {{
                            sourceFetchState.loading || moveTargetState.loading
                                ? msg("text.opening")
                                : msg("text.openPageName")
                        }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
