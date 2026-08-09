<template>
    <cdx-dialog
        v-model:open="open"
        class="avgp-dialog"
        :title="subjectTitle"
        :lang="interfaceLocale"
        @update:open="onOpenChange"
    >
        <div class="avgp-dialog__body">
            <cdx-message v-if="status" class="avgp-status" :type="statusType">
                {{ status }}
            </cdx-message>
            <cdx-progress-bar
                v-if="saving"
                class="avgp-save-progress"
                :aria-label="status || msg('dialog.saving')"
            />

            <fieldset class="avgp-fieldset">
                <legend class="avgp-fieldset-title">
                    {{ msg("dialog.assessment") }}
                </legend>
                <div class="avgp-assessment-grid">
                    <section
                        class="avgp-controls"
                        :aria-label="msg('dialog.assessmentControls')"
                    >
                        <cdx-field class="avgp-section" :is-fieldset="true">
                            <template #label>
                                {{ msg("dialog.class") }}
                            </template>
                            <div class="avgp-button-group">
                                <cdx-radio
                                    v-for="option in classOptions"
                                    :key="option.value"
                                    :model-value="assessment.className"
                                    :input-value="option.value"
                                    name="className"
                                    @update:model-value="setClassName"
                                >
                                    {{ option.label }}
                                </cdx-radio>
                            </div>
                        </cdx-field>

                        <cdx-field class="avgp-section" :is-fieldset="true">
                            <template #label>
                                {{ msg("dialog.importance") }}
                            </template>
                            <div class="avgp-button-group">
                                <cdx-radio
                                    v-for="option in importanceOptions"
                                    :key="option.value || '__empty__'"
                                    :model-value="assessment.importance"
                                    :input-value="option.value"
                                    name="importance"
                                    @update:model-value="setImportance"
                                >
                                    {{ option.label }}
                                </cdx-radio>
                            </div>
                        </cdx-field>

                        <cdx-field class="avgp-section" :is-fieldset="true">
                            <template #label>
                                {{ msg("dialog.taskForces") }}
                            </template>
                            <div class="avgp-check-grid">
                                <cdx-checkbox
                                    v-for="option in taskForceOptions"
                                    :key="option.id"
                                    :model-value="
                                        assessment.taskForces[option.id]
                                    "
                                    :name="'taskForce-' + option.id"
                                    @update:model-value="
                                        setSelection(
                                            'taskForces',
                                            option.id,
                                            $event,
                                        )
                                    "
                                >
                                    {{ option.label }}
                                </cdx-checkbox>
                            </div>
                        </cdx-field>

                        <cdx-field class="avgp-section" :is-fieldset="true">
                            <template #label>
                                {{ msg("dialog.maintenance") }}
                            </template>
                            <div class="avgp-check-grid">
                                <cdx-checkbox
                                    v-for="option in maintenanceOptions"
                                    :key="option.id"
                                    :model-value="
                                        assessment.maintenance[option.id]
                                    "
                                    :name="'maintenance-' + option.id"
                                    @update:model-value="
                                        setSelection(
                                            'maintenance',
                                            option.id,
                                            $event,
                                        )
                                    "
                                >
                                    {{ option.label }}
                                </cdx-checkbox>
                            </div>
                        </cdx-field>

                        <cdx-field class="avgp-section" :is-fieldset="true">
                            <template #label>
                                {{ msg("dialog.otherProjects") }}
                            </template>
                            <div class="avgp-check-grid">
                                <cdx-checkbox
                                    v-for="option in otherProjectOptions"
                                    :key="option.id"
                                    :model-value="
                                        assessment.otherProjects[option.id]
                                    "
                                    :name="'otherProject-' + option.id"
                                    @update:model-value="
                                        setSelection(
                                            'otherProjects',
                                            option.id,
                                            $event,
                                        )
                                    "
                                >
                                    {{ option.label }}
                                </cdx-checkbox>
                            </div>
                        </cdx-field>
                    </section>

                    <section
                        class="avgp-source"
                        :aria-label="msg('dialog.leadPreview')"
                    >
                        <cdx-field class="avgp-section avgp-source-field">
                            <template #label>
                                {{ msg("dialog.readySource") }}
                            </template>
                            <cdx-text-area
                                class="avgp-compare-textarea"
                                :model-value="previewText"
                                rows="8"
                                @update:model-value="onPreviewInput"
                            />
                        </cdx-field>
                        <cdx-field
                            class="avgp-section avgp-source-field avgp-comparison-field"
                        >
                            <template #label>
                                {{ msg("dialog.leadDiff") }}
                            </template>
                            <wikitext-comparison
                                :after-label="msg('dialog.after')"
                                :before-label="msg('dialog.currentSource')"
                                :comparison="talkComparison"
                                :no-changes-label="
                                    msg('registration.noChanges')
                                "
                            />
                        </cdx-field>
                    </section>
                </div>

                <cdx-field class="avgp-section avgp-summary">
                    <template #label>
                        {{ msg("dialog.editSummary") }}
                    </template>
                    <cdx-text-input
                        :model-value="summary"
                        @update:model-value="onSummaryInput"
                    />
                </cdx-field>
            </fieldset>

            <fieldset class="avgp-fieldset">
                <legend class="avgp-fieldset-title">
                    {{ msg("dialog.newPageList") }}
                </legend>
                <cdx-field class="avgp-section">
                    <p
                        v-if="!registrationEligible"
                        class="avgp-registration-message"
                    >
                        {{ registrationLabel }}
                    </p>
                    <cdx-checkbox
                        v-else
                        :model-value="shouldRegister"
                        :disabled="registrationDisabled"
                        @update:model-value="setRegister"
                    >
                        {{ registrationLabel }}
                    </cdx-checkbox>
                </cdx-field>

                <div
                    v-if="showRegistrationPreview"
                    class="avgp-section avgp-list-preview"
                >
                    <wikitext-comparison
                        :after-label="msg('dialog.after')"
                        :before-label="msg('dialog.before')"
                        :comparison="listComparison"
                        :no-changes-label="msg('registration.noChanges')"
                    />
                </div>

                <cdx-field
                    v-if="showRegistrationPreview"
                    class="avgp-section avgp-list-summary"
                >
                    <template #label>
                        {{ msg("dialog.editSummary") }}
                    </template>
                    <cdx-text-input
                        :model-value="listSummary"
                        @update:model-value="setListSummary"
                    />
                </cdx-field>
            </fieldset>
        </div>

        <template #footer>
            <div class="avgp-actions">
                <cdx-button :disabled="saving" @click="onCancel">
                    {{ msg("dialog.cancel") }}
                </cdx-button>
                <cdx-button
                    action="progressive"
                    weight="primary"
                    :disabled="saving"
                    @click="onSave"
                >
                    {{ msg("dialog.save") }}
                </cdx-button>
            </div>
        </template>
    </cdx-dialog>
</template>
