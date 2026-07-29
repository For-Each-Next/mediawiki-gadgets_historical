<template>
    <cdx-dialog v-model:open="preSaveOpen" :title="msg('presave.title')">
        <p>
            {{
                preSaveProgress == null
                    ? msg("presave.description")
                    : msg("presave.running")
            }}
        </p>
        <cdx-progress-indicator show-label v-if="isPreSaveProgressRunning()">
            {{ getPreSaveCurrentStepLabel() }}
        </cdx-progress-indicator>
        <div class="vg-stub-creator-pre-save-groups">
            <section
                class="vg-stub-creator-pre-save-page"
                v-bind:key="group.key"
                v-for="group in getVisiblePreSaveGroups()"
            >
                <div class="vg-stub-creator-pre-save-title">
                    {{ group.title }}
                </div>
                <ul class="vg-stub-creator-pre-save-list">
                    <li
                        class="vg-stub-creator-pre-save-item"
                        v-bind:class="getPreSaveProgressRowClass(row.step)"
                        v-bind:key="row.key"
                        v-for="row in group.rows"
                    >
                        <template v-if="row.type === 'progress'">
                            <cdx-icon
                                v-bind:class="
                                    getPreSaveStatusIconClass(row.step.status)
                                "
                                v-bind:icon="
                                    getPreSaveStatusIcon(row.step.status)
                                "
                            ></cdx-icon>
                            <span>{{ row.label }}</span>
                        </template>
                        <cdx-checkbox
                            v-else-if="row.type === 'action'"
                            v-model="row.action.selected"
                        >
                            {{ row.label }}
                        </cdx-checkbox>
                        <cdx-checkbox
                            v-else-if="row.type === 'registration'"
                            v-model="form.registerNewPage"
                        >
                            {{ row.label }}
                        </cdx-checkbox>
                        <cdx-checkbox
                            v-else-if="row.type === 'bundled-action'"
                            v-model="row.action.selected"
                        >
                            {{ row.label }}
                        </cdx-checkbox>
                        <span class="vg-stub-creator-pre-save-note" v-else>
                            {{ row.label }}
                        </span>
                    </li>
                </ul>
            </section>
        </div>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="sourceFetchState.error"
        >
            {{ sourceFetchState.error }}
        </cdx-message>
        <cdx-message
            class="vg-stub-creator-message"
            type="error"
            v-if="preSaveProgress &amp;&amp; preSaveProgress.error"
        >
            {{ preSaveProgress.error }}
        </cdx-message>
        <template v-slot:footer>
            <div class="vg-stub-creator-dialog-footer">
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="preSaveOpen = false"
                        v-bind:disabled="sourceFetchState.loading"
                        weight="quiet"
                    >
                        {{ msg("common.close") }}
                    </cdx-button>
                </div>
                <div class="vg-stub-creator-dialog-footer-group">
                    <cdx-button
                        type="button"
                        v-on:click="confirmSubmit"
                        action="progressive"
                        v-bind:disabled="
                            sourceFetchState.loading || preSaveProgress != null
                        "
                        weight="primary"
                    >
                        {{
                            sourceFetchState.loading
                                ? msg("presave.preparing")
                                : msg("common.save")
                        }}
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
