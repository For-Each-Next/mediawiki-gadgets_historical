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
                                    v-for="value in classValues"
                                    :key="value"
                                    :model-value="assessment.className"
                                    :input-value="value"
                                    name="className"
                                    @update:model-value="setClassName"
                                >
                                    {{ value }}
                                </cdx-radio>
                            </div>
                        </cdx-field>

                        <cdx-field class="avgp-section" :is-fieldset="true">
                            <template #label>
                                {{ msg("dialog.importance") }}
                            </template>
                            <div class="avgp-button-group">
                                <cdx-radio
                                    v-for="value in importanceValues"
                                    :key="value || '__empty__'"
                                    :model-value="assessment.importance"
                                    :input-value="value"
                                    name="importance"
                                    @update:model-value="setImportance"
                                >
                                    {{ value || msg("common.empty") }}
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
                                class="avgp-source-textarea"
                                :model-value="previewText"
                                rows="8"
                                @update:model-value="onPreviewInput"
                            />
                        </cdx-field>
                        <cdx-field class="avgp-section avgp-source-field">
                            <template #label>
                                {{ msg("dialog.currentSource") }}
                            </template>
                            <cdx-text-area
                                class="avgp-source-textarea"
                                :model-value="currentSource"
                                :readonly="true"
                                rows="8"
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
                    <div
                        v-if="registrationLoading"
                        class="avgp-register-loading"
                        aria-live="polite"
                    >
                        <span>{{ msg("registration.loading") }}</span>
                        <cdx-progress-bar
                            :aria-label="msg('registration.loading')"
                        />
                    </div>
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
                    <div class="avgp-compare-grid">
                        <cdx-field
                            class="avgp-compare-field avgp-compare-field--removed"
                        >
                            <template #label>
                                {{ msg("dialog.before") }}
                            </template>
                            <cdx-text-area
                                class="avgp-compare-textarea"
                                :model-value="listComparison.before"
                                :readonly="true"
                                rows="8"
                            />
                        </cdx-field>
                        <cdx-field
                            class="avgp-compare-field avgp-compare-field--added"
                        >
                            <template #label>
                                {{ msg("dialog.after") }}
                            </template>
                            <cdx-text-area
                                class="avgp-compare-textarea"
                                :model-value="listComparison.after"
                                :readonly="true"
                                rows="8"
                            />
                        </cdx-field>
                    </div>
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
