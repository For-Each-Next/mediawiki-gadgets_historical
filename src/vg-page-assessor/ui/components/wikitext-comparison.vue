<template>
    <div class="avgp-comparison">
        <cdx-card class="avgp-comparison__card">
            <template #title>
                {{ beforeLabel }}
            </template>
            <template #description>
                <div class="avgp-comparison__source">
                    <div
                        v-if="!comparison.changed"
                        class="avgp-comparison__message"
                    >
                        {{ noChangesLabel }}
                    </div>
                    <template
                        v-for="(row, rowIndex) in comparison.rows"
                        :key="rowIndex"
                    >
                        <div
                            v-if="row.kind === 'omitted'"
                            class="avgp-comparison__omitted"
                        >
                            ⋯
                        </div>
                        <div
                            v-else
                            class="avgp-comparison__line"
                            :class="
                                'avgp-comparison__line--' + row.before.kind
                            "
                        >
                            <span class="avgp-comparison__marker">
                                {{ row.before.kind === "removed" ? "−" : "" }}
                            </span>
                            <code class="avgp-comparison__code"
                                ><span
                                    v-for="(segment, segmentIndex) in row
                                        .before.segments"
                                    :key="segmentIndex"
                                    :class="{
                                        'avgp-comparison__segment--changed':
                                            segment.kind === 'changed',
                                    }"
                                    >{{ segment.text }}</span
                                ></code
                            >
                        </div>
                    </template>
                </div>
            </template>
        </cdx-card>

        <cdx-card class="avgp-comparison__card">
            <template #title>
                {{ afterLabel }}
            </template>
            <template #description>
                <div class="avgp-comparison__source">
                    <div
                        v-if="!comparison.changed"
                        class="avgp-comparison__message"
                    >
                        {{ noChangesLabel }}
                    </div>
                    <template
                        v-for="(row, rowIndex) in comparison.rows"
                        :key="rowIndex"
                    >
                        <div
                            v-if="row.kind === 'omitted'"
                            class="avgp-comparison__omitted"
                        >
                            ⋯
                        </div>
                        <div
                            v-else
                            class="avgp-comparison__line"
                            :class="'avgp-comparison__line--' + row.after.kind"
                        >
                            <span class="avgp-comparison__marker">
                                {{ row.after.kind === "added" ? "+" : "" }}
                            </span>
                            <code class="avgp-comparison__code"
                                ><span
                                    v-for="(segment, segmentIndex) in row.after
                                        .segments"
                                    :key="segmentIndex"
                                    :class="{
                                        'avgp-comparison__segment--changed':
                                            segment.kind === 'changed',
                                    }"
                                    >{{ segment.text }}</span
                                ></code
                            >
                        </div>
                    </template>
                </div>
            </template>
        </cdx-card>
    </div>
</template>
