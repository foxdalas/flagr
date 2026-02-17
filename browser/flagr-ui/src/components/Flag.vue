<template>
  <el-row>
    <el-col
      :span="20"
      :offset="2"
    >
      <div class="container flag-container">
        <el-dialog
          v-model="dialogDeleteFlagVisible"
          destroy-on-close
          title="Delete feature flag"
        >
          <p>This action cannot be undone. Type the flag key <b>{{ flag.key }}</b> to confirm.</p>
          <el-input
            v-model="deleteFlagKeyConfirm"
            placeholder="Type flag key to confirm"
          />
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="dialogDeleteFlagVisible = false">Cancel</el-button>
              <el-button
                type="danger"
                :disabled="deleteFlagKeyConfirm !== flag.key"
                :loading="deletingFlag"
                @click.prevent="deleteFlag"
              >Delete</el-button>
            </span>
          </template>
        </el-dialog>

        <el-dialog
          v-model="dialogEditDistributionOpen"
          destroy-on-close
          title="Edit distribution"
        >
          <div v-if="loaded && flag">
            <div
              v-for="variant in flag.variants"
              :key="'distribution-variant-' + variant.id"
            >
              <div>
                <el-checkbox
                  :model-value="!!newDistributions[variant.id]"
                  @change="(e) => selectVariant(e, variant)"
                />
                <el-tag
                  type="danger"
                  :disable-transitions="true"
                >
                  {{ variant.key }}
                </el-tag>
              </div>
              <el-slider
                v-if="!newDistributions[variant.id]"
                :model-value="0"
                :disabled="true"
                show-input
              />
              <div v-if="!!newDistributions[variant.id]">
                <el-slider
                  v-model="newDistributions[variant.id].percent"
                  :disabled="false"
                  show-input
                />
              </div>
            </div>
          </div>
          <div class="distribution-presets">
            <span class="distribution-presets__label">Presets:</span>
            <el-button
              size="small"
              @click="applyPreset('even')"
            >
              Even Split
            </el-button>
            <el-button
              size="small"
              @click="applyPreset('control')"
            >
              100% Control
            </el-button>
            <el-button
              size="small"
              :disabled="checkedVariantIds.length < 2"
              @click="applyPreset('canary')"
            >
              Canary 1/99
            </el-button>
            <el-button
              size="small"
              :disabled="checkedVariantIds.length < 2"
              @click="applyPreset('gradual')"
            >
              Gradual 10/90
            </el-button>
          </div>
          <el-button
            class="width--full"
            :disabled="!newDistributionIsValid"
            :loading="savingDistribution"
            @click.prevent="() => saveDistribution(selectedSegment)"
          >
            Save
          </el-button>

          <el-alert
            v-if="!newDistributionIsValid"
            class="edit-distribution-alert"
            :title="
              'Percentages must add up to 100% (currently at ' +
                newDistributionPercentageSum +
                '%)'
            "
            type="error"
            show-icon
          />
        </el-dialog>

        <el-dialog
          v-model="dialogCreateSegmentOpen"
          destroy-on-close
          title="Create segment"
        >
          <div>
            <p>
              <el-input
                v-model="newSegment.description"
                placeholder="Segment description"
              />
            </p>
            <p>
              <span class="segment-rollout-label">Rollout %</span>
              <el-input-number
                v-model="newSegment.rolloutPercent"
                :min="0"
                :max="100"
                :step="1"
                :precision="0"
                controls-position="right"
              />
            </p>
            <el-button
              class="width--full"
              :disabled="!newSegment.description"
              :loading="creatingSegment"
              @click.prevent="createSegment"
            >
              Create Segment
            </el-button>
          </div>
        </el-dialog>

        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ name: 'home' }">
            Flags
          </el-breadcrumb-item>
          <el-breadcrumb-item>Flag ID: {{ route.params.flagId }}</el-breadcrumb-item>
        </el-breadcrumb>

        <div v-if="loaded && flag">
          <div class="sticky-flag-header">
            <span class="sticky-flag-header__key">{{ flag.key || 'Flag ' + flag.id }}</span>
            <span
              class="sticky-flag-header__status"
              :class="flag.enabled ? 'is-enabled' : 'is-disabled'"
              aria-hidden="true"
            />
            <el-tag
              v-if="isDirty"
              type="warning"
              size="small"
            >
              Unsaved changes
            </el-tag>
            <div class="sticky-flag-header__actions">
              <el-tooltip
                :content="isMac ? 'Cmd+S' : 'Ctrl+S'"
                placement="bottom"
                effect="light"
              >
                <el-button
                  :disabled="!isDirty"
                  :loading="savingFlag"
                  @click="putFlag(flag)"
                >
                  Save Flag
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <el-tabs @tab-click="handleHistoryTabClick">
            <el-tab-pane label="Config">
              <el-card class="flag-config-card">
                <template #header>
                  <div class="el-card-header">
                    <div class="flex-row">
                      <div class="flex-row-left">
                        <h2>Flag</h2>
                      </div>
                      <div
                        v-if="flag"
                        class="flex-row-right flag-enable-row"
                      >
                        <span
                          class="flag-enable-label"
                          :class="flag.enabled ? 'is-enabled' : 'is-disabled'"
                        >
                          {{ flag.enabled ? 'Enabled' : 'Disabled' }}
                        </span>
                        <el-tooltip
                          content="Enable/Disable Flag"
                          placement="top"
                          effect="light"
                        >
                          <el-switch
                            v-model="flag.enabled"
                            :active-value="true"
                            :inactive-value="false"
                            aria-label="Enable or disable this feature flag"
                            @change="setFlagEnabled"
                          />
                        </el-tooltip>
                      </div>
                    </div>
                  </div>
                </template>
                <el-card
                  shadow="hover"
                  :class="toggleInnerConfigCard"
                >
                  <div class="flex-row id-row">
                    <div class="flex-row-left">
                      <el-tag
                        type="primary"
                        :disable-transitions="true"
                      >
                        Flag ID: {{ route.params.flagId }}
                      </el-tag>
                      <el-tooltip
                        content="Copy Flag ID"
                        placement="top"
                        effect="light"
                      >
                        <button
                          class="copy-btn"
                          aria-label="Copy Flag ID to clipboard"
                          @click="copyId"
                        >
                          <el-icon :size="14">
                            <Check v-if="idCopied" />
                            <CopyDocument v-else />
                          </el-icon>
                        </button>
                      </el-tooltip>
                    </div>
                    <div class="flex-row-right">
                      <el-button
                        size="small"
                        :loading="savingFlag"
                        @click="putFlag(flag)"
                      >
                        Save Flag
                      </el-button>
                    </div>
                  </div>
                  <el-row
                    class="flag-content"
                    align="middle"
                  >
                    <el-col :span="19">
                      <el-input
                        v-model="flag.key"
                        size="small"
                        placeholder="Key"
                      >
                        <template #prepend>
                          Flag Key
                        </template>
                        <template #append>
                          <el-tooltip
                            content="Copy Flag Key"
                            placement="top"
                            effect="light"
                          >
                            <button
                              class="copy-btn copy-btn--inline"
                              aria-label="Copy Flag Key to clipboard"
                              @click="copyKey"
                            >
                              <el-icon :size="14">
                                <Check v-if="keyCopied" />
                                <CopyDocument v-else />
                              </el-icon>
                            </button>
                          </el-tooltip>
                        </template>
                      </el-input>
                    </el-col>
                    <el-col :span="5">
                      <div class="data-records-group">
                        <el-switch
                          v-model="flag.dataRecordsEnabled"
                          size="small"
                          :active-value="true"
                          :inactive-value="false"
                        />
                        <div class="data-records-label">
                          Data Records
                          <el-tooltip
                            content="Controls whether to log to data pipeline, e.g. Kafka, Kinesis, Pubsub"
                            placement="top-end"
                            effect="light"
                          >
                            <el-icon><InfoFilled /></el-icon>
                          </el-tooltip>
                        </div>
                      </div>
                    </el-col>
                  </el-row>
                  <el-row
                    class="flag-content"
                    align="middle"
                  >
                    <el-col :span="19">
                      <el-input
                        v-model="flag.description"
                        size="small"
                        placeholder="Description"
                      >
                        <template #prepend>
                          Flag Description
                        </template>
                      </el-input>
                    </el-col>
                    <el-col :span="5">
                      <div
                        v-show="!!flag.dataRecordsEnabled"
                        class="data-records-group"
                      >
                        <el-select
                          v-model="flag.entityType"
                          size="small"
                          filterable
                          :allow-create="allowCreateEntityType"
                          default-first-option
                          placeholder="Entity Type"
                        >
                          <el-option
                            v-for="item in entityTypes"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                          />
                        </el-select>
                        <div class="data-records-label">
                          Entity Type
                          <el-tooltip
                            content="Overrides the entityType in data records logging"
                            placement="top-end"
                            effect="light"
                          >
                            <el-icon><InfoFilled /></el-icon>
                          </el-tooltip>
                        </div>
                      </div>
                    </el-col>
                  </el-row>
                  <div class="section-heading">
                    <h5>
                      <span class="section-heading__label">Flag Notes</span>
                      <el-button
                        round
                        size="small"
                        :aria-expanded="showMdEditor"
                        aria-controls="markdown-editor"
                        @click="toggleShowMdEditor"
                      >
                        <el-icon v-if="!showMdEditor">
                          <Edit />
                        </el-icon>
                        <el-icon v-else>
                          <View />
                        </el-icon>
                        {{ !showMdEditor ? "edit" : "view" }}
                      </el-button>
                    </h5>
                  </div>
                  <div>
                    <markdown-editor
                      v-model:markdown="flag.notes"
                      :show-editor="showMdEditor"
                    />
                  </div>
                  <div class="section-heading">
                    <h5>
                      <span class="section-heading__label">Tags</span>
                    </h5>
                  </div>
                  <div>
                    <div class="tags-container-inner">
                      <el-tag
                        v-for="tag in flag.tags"
                        :key="tag.id"
                        closable
                        @close="deleteTag(tag)"
                      >
                        {{ tag.value }}
                      </el-tag>
                      <div
                        v-if="tagInputVisible"
                        class="tag-key-input"
                      >
                        <el-autocomplete
                          ref="saveTagInput"
                          v-model="newTag.value"
                          size="small"
                          class="width--full"
                          :trigger-on-focus="false"
                          :fetch-suggestions="queryTags"
                          @select="createTag"
                          @keyup.enter="createTag"
                          @keyup.esc="cancelCreateTag"
                        />
                      </div>
                      <el-button
                        v-else
                        class="button-new-tag"
                        size="small"
                        @click="showTagInput"
                      >
                        + New Tag
                      </el-button>
                    </div>
                  </div>
                </el-card>
              </el-card>

              <el-card class="variants-container">
                <template #header>
                  <div class="clearfix">
                    <h2>Variants</h2>
                  </div>
                </template>
                <div
                  v-if="flag.variants.length"
                  class="variants-container-inner"
                >
                  <div
                    v-for="variant in flag.variants"
                    :key="variant.id"
                  >
                    <el-card shadow="hover">
                      <el-form
                        label-position="left"
                        label-width="100px"
                      >
                        <div class="flex-row id-row">
                          <el-tag
                            type="primary"
                            :disable-transitions="true"
                          >
                            Variant ID:
                            <b>{{ variant.id }}</b>
                          </el-tag>
                          <el-input
                            v-model="variant.key"
                            class="variant-key-input"
                            size="small"
                            placeholder="Key"
                          >
                            <template #prepend>
                              Key
                            </template>
                          </el-input>
                          <div class="flex-row-right save-remove-variant-row">
                            <el-button
                              size="small"
                              :loading="savingVariant"
                              @click="putVariant(variant)"
                            >
                              Save Variant
                            </el-button>
                            <el-tooltip
                              content="Delete variant"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                aria-label="Delete variant"
                                @click="deleteVariant(variant)"
                              >
                                <el-icon><Delete /></el-icon>
                              </el-button>
                            </el-tooltip>
                          </div>
                        </div>
                        <el-collapse class="flex-row">
                          <el-collapse-item
                            title="Variant attachment"
                            class="variant-attachment-collapsable-title"
                          >
                            <p
                              class="variant-attachment-title"
                            >
                              You can add JSON in key/value pairs format.
                            </p>
                            <JsonEditorVue
                              v-model="variant.attachment"
                              mode="tree"
                              :main-menu-bar="true"
                              :navigation-bar="false"
                              :status-bar="false"
                              class="variant-attachment-content"
                              @change="(content, prev, { contentErrors }) => handleAttachmentChange(variant, content, contentErrors)"
                            />
                          </el-collapse-item>
                        </el-collapse>
                      </el-form>
                    </el-card>
                  </div>
                </div>
                <div
                  v-else
                  class="card--empty"
                >
                  <div class="empty-icon">
                    <el-icon><Operation /></el-icon>
                  </div>
                  <div class="empty-title">
                    No variants defined yet
                  </div>
                  <div class="empty-hint">
                    Variants represent the different values this flag can return.
                  </div>
                </div>
                <div class="variants-input">
                  <div class="flex-row equal-width constraints-inputs-container">
                    <div>
                      <el-input
                        v-model="newVariant.key"
                        placeholder="Variant Key"
                        :class="{ 'is-error': newVariantKeyError }"
                      />
                      <div
                        v-if="newVariantKeyError"
                        class="input-error-msg"
                      >
                        {{ newVariantKeyError }}
                      </div>
                    </div>
                  </div>
                  <el-button
                    class="width--full"
                    :disabled="!newVariant.key || !!newVariantKeyError"
                    :loading="creatingVariant"
                    @click.prevent="createVariant"
                  >
                    Create Variant
                  </el-button>
                </div>
              </el-card>

              <el-card class="segments-container">
                <template #header>
                  <div class="el-card-header">
                    <div class="flex-row">
                      <div class="flex-row-left">
                        <h2>Segments</h2>
                      </div>
                      <div class="flex-row-right">
                        <el-button @click="dialogCreateSegmentOpen = true">
                          New Segment
                        </el-button>
                      </div>
                    </div>
                  </div>
                </template>
                <div
                  v-if="flag.segments.length"
                  class="segment-order-hint"
                >
                  Segments are evaluated top to bottom — first match wins.
                </div>
                <div
                  v-if="flag.segments.length"
                  class="segments-container-inner"
                >
                  <draggable
                    v-model="flag.segments"
                    item-key="id"
                    handle=".drag-handle"
                    @start="drag = true"
                    @end="onDragEnd"
                  >
                    <template #item="{ element: segment, index: segmentIndex }">
                      <el-card
                        shadow="hover"
                        class="segment"
                      >
                        <div class="flex-row id-row">
                          <div class="flex-row-left">
                            <span class="drag-handle">
                              <el-icon><Rank /></el-icon>
                            </span>
                            <span class="segment-order-badge">[{{ segmentIndex + 1 }}]</span>
                            <el-tag
                              type="primary"
                              :disable-transitions="true"
                            >
                              Segment ID:
                              <b>{{ segment.id }}</b>
                            </el-tag>
                          </div>
                          <div class="flex-row-right">
                            <el-button
                              size="small"
                              :loading="savingSegment"
                              @click="putSegment(segment)"
                            >
                              Save Segment Setting
                            </el-button>
                            <el-tooltip
                              content="Delete segment"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                aria-label="Delete segment"
                                @click="deleteSegment(segment)"
                              >
                                <el-icon><Delete /></el-icon>
                              </el-button>
                            </el-tooltip>
                            <el-tooltip
                              content="Move up"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                aria-label="Move segment up"
                                :disabled="segmentIndex === 0"
                                @click="moveSegment(segment, -1)"
                              >
                                <el-icon><ArrowUp /></el-icon>
                              </el-button>
                            </el-tooltip>
                            <el-tooltip
                              content="Move down"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                aria-label="Move segment down"
                                :disabled="segmentIndex === flag.segments.length - 1"
                                @click="moveSegment(segment, 1)"
                              >
                                <el-icon><ArrowDown /></el-icon>
                              </el-button>
                            </el-tooltip>
                          </div>
                        </div>
                        <el-row
                          :gutter="10"
                          class="id-row"
                        >
                          <el-col :span="18">
                            <el-input
                              v-model="segment.description"
                              size="small"
                              placeholder="Description"
                            >
                              <template #prepend>
                                Description
                              </template>
                            </el-input>
                          </el-col>
                          <el-col :span="6">
                            <div class="segment-rollout-row">
                              <el-tooltip
                                content="Percentage of matching entities included in this segment"
                                placement="top"
                                effect="light"
                              >
                                <span class="segment-rollout-label">Rollout %</span>
                              </el-tooltip>
                              <el-input-number
                                v-model="segment.rolloutPercent"
                                class="segment-rollout-percent"
                                size="small"
                                :min="0"
                                :max="100"
                                :step="1"
                                :precision="0"
                                controls-position="right"
                              />
                            </div>
                          </el-col>
                        </el-row>
                        <el-row>
                          <el-col :span="24">
                            <h5>Constraints (match ALL of them)</h5>
                            <div class="constraints">
                              <div
                                v-if="segment.constraints.length"
                                class="constraints-inner"
                              >
                                <div
                                  v-for="constraint in segment.constraints"
                                  :key="constraint.id"
                                >
                                  <el-row
                                    :gutter="3"
                                    class="segment-constraint"
                                  >
                                    <el-col :span="20">
                                      <el-input
                                        v-model="constraint.property"
                                        size="small"
                                        placeholder="Property"
                                      >
                                        <template #prepend>
                                          Property
                                        </template>
                                      </el-input>
                                    </el-col>
                                    <el-col :span="4">
                                      <el-select
                                        v-model="constraint.operator"
                                        class="width--full"
                                        size="small"
                                        placeholder="operator"
                                      >
                                        <el-option
                                          v-for="item in operatorOptions"
                                          :key="item.value"
                                          :label="item.label"
                                          :value="item.value"
                                        >
                                          <span>{{ item.label }}</span>
                                          <span class="operator-desc">{{ item.description }}</span>
                                        </el-option>
                                      </el-select>
                                    </el-col>
                                    <el-col :span="20">
                                      <el-input
                                        v-model="constraint.value"
                                        size="small"
                                        placeholder="e.g. &quot;CA&quot; for strings, 18 for numbers"
                                      >
                                        <template #prepend>
                                          Value
                                        </template>
                                      </el-input>
                                    </el-col>
                                    <el-col :span="2">
                                      <el-button
                                        type="success"
                                        plain
                                        class="width--full"
                                        size="small"
                                        @click="
                                          putConstraint(segment, constraint)
                                        "
                                      >
                                        Save
                                      </el-button>
                                    </el-col>
                                    <el-col :span="2">
                                      <el-tooltip
                                        content="Delete constraint"
                                        placement="top"
                                        effect="light"
                                      >
                                        <el-button
                                          type="danger"
                                          plain
                                          class="width--full"
                                          size="small"
                                          aria-label="Delete constraint"
                                          @click="
                                            deleteConstraint(segment, constraint)
                                          "
                                        >
                                          <el-icon><Delete /></el-icon>
                                        </el-button>
                                      </el-tooltip>
                                    </el-col>
                                  </el-row>
                                </div>
                              </div>
                              <div
                                v-else
                                class="card--empty"
                              >
                                <div class="empty-icon">
                                  <el-icon><Setting /></el-icon>
                                </div>
                                <div class="empty-title">
                                  No constraints
                                </div>
                                <div class="empty-hint">
                                  All entities will match this segment.
                                </div>
                              </div>
                              <div>
                                <el-row
                                  :gutter="3"
                                  class="segment-constraint"
                                >
                                  <el-col :span="20">
                                    <el-input
                                      v-model="segment.newConstraint.property"
                                      size="small"
                                      placeholder="Property"
                                    >
                                      <template #prepend>
                                        Property
                                      </template>
                                    </el-input>
                                  </el-col>
                                  <el-col :span="4">
                                    <el-select
                                      v-model="segment.newConstraint.operator"
                                      class="width--full"
                                      size="small"
                                      placeholder="operator"
                                    >
                                      <el-option
                                        v-for="item in operatorOptions"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value"
                                      >
                                        <span>{{ item.label }}</span>
                                        <span class="operator-desc">{{ item.description }}</span>
                                      </el-option>
                                    </el-select>
                                  </el-col>
                                  <el-col :span="20">
                                    <el-input
                                      v-model="segment.newConstraint.value"
                                      size="small"
                                      placeholder="Value"
                                    >
                                      <template #prepend>
                                        Value
                                      </template>
                                    </el-input>
                                    <div
                                      v-if="segment.newConstraint.value && constraintValueHint(segment.newConstraint.operator, segment.newConstraint.value)"
                                      class="constraint-hint"
                                      role="alert"
                                    >
                                      {{ constraintValueHint(segment.newConstraint.operator, segment.newConstraint.value) }}
                                    </div>
                                  </el-col>
                                  <el-col :span="4">
                                    <el-button
                                      class="width--full"
                                      size="small"
                                      type="primary"
                                      plain
                                      :disabled="
                                        !segment.newConstraint.property ||
                                          !segment.newConstraint.value ||
                                          !!constraintValueHint(segment.newConstraint.operator, segment.newConstraint.value)
                                      "
                                      @click.prevent="
                                        () => createConstraint(segment)
                                      "
                                    >
                                      Add Constraint
                                    </el-button>
                                  </el-col>
                                </el-row>
                              </div>
                            </div>
                          </el-col>
                          <el-col
                            :span="24"
                            class="segment-distributions"
                          >
                            <h5>
                              <span>Distribution</span>
                              <el-button
                                round
                                size="small"
                                @click="editDistribution(segment)"
                              >
                                <el-icon><Edit /></el-icon> edit
                              </el-button>
                            </h5>
                            <el-row
                              v-if="segment.distributions.length"
                              :gutter="20"
                            >
                              <el-col
                                v-for="distribution in segment.distributions"
                                :key="distribution.id"
                                :span="8"
                              >
                                <el-card
                                  shadow="never"
                                  class="distribution-card"
                                >
                                  <div>
                                    <span size="small">
                                      {{
                                        distribution.variantKey
                                      }}
                                    </span>
                                  </div>
                                  <el-progress
                                    type="circle"
                                    :width="70"
                                    :percentage="distribution.percent"
                                  />
                                </el-card>
                              </el-col>
                            </el-row>

                            <div
                              v-else
                              class="card--empty"
                            >
                              <div class="empty-icon">
                                <el-icon><DataAnalysis /></el-icon>
                              </div>
                              <div class="empty-title">
                                No distribution configured
                              </div>
                              <div class="empty-hint">
                                Click 'edit' to control traffic allocation.
                              </div>
                            </div>
                          </el-col>
                        </el-row>
                      </el-card>
                    </template>
                  </draggable>
                </div>
                <div
                  v-else
                  class="card--empty"
                >
                  <div class="empty-icon">
                    <el-icon><Aim /></el-icon>
                  </div>
                  <div class="empty-title">
                    No segments yet
                  </div>
                  <div class="empty-hint">
                    Segments define targeting rules for this flag.
                  </div>
                  <el-button
                    size="small"
                    style="margin-top: 8px;"
                    @click="dialogCreateSegmentOpen = true"
                  >
                    New Segment
                  </el-button>
                </div>
              </el-card>
              <debug-console :flag="flag" />
              <el-card>
                <template #header>
                  <div class="el-card-header">
                    <h2>Flag Settings</h2>
                  </div>
                </template>
                <el-button
                  type="danger"
                  plain
                  @click="deleteFlagKeyConfirm = ''; dialogDeleteFlagVisible = true"
                >
                  <el-icon><Delete /></el-icon>
                  Delete Flag
                </el-button>
              </el-card>
              <spinner v-if="!loaded" />
            </el-tab-pane>

            <el-tab-pane
              label="Evaluation Flow"
              lazy
            >
              <flag-eval-flow :flag="flag" />
            </el-tab-pane>

            <el-tab-pane label="History">
              <flag-history
                v-if="historyLoaded"
                :flag-id="parseInt(route.params.flagId, 10)"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent, toRaw } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import draggable from "vuedraggable";
import Axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, View, InfoFilled, ArrowUp, ArrowDown, Operation, Aim, Setting, DataAnalysis, CopyDocument, Check, Rank } from "@element-plus/icons-vue";

const JsonEditorVue = defineAsyncComponent(() => import("json-editor-vue"));
const FlagEvalFlow = defineAsyncComponent(() => import("@/components/FlagEvalFlow.vue"));

import constants from "@/constants";
import helpers from "@/helpers/helpers";
import { useAsyncAction } from "@/composables/useAsyncAction";
import { useDirtyState } from "@/composables/useDirtyState";
import { useClipboard } from "@/composables/useClipboard";
import Spinner from "@/components/Spinner";
import DebugConsole from "@/components/DebugConsole";
const FlagHistory = defineAsyncComponent(() => import("@/components/FlagHistory"));
const MarkdownEditor = defineAsyncComponent(() => import("@/components/MarkdownEditor.vue"));
import { operators } from "@/operators.json";

const { sum, pluck, handleErr } = helpers;
const { API_URL, FLAGR_UI_POSSIBLE_ENTITY_TYPES } = constants;

const DEFAULT_SEGMENT = {
  description: "",
  rolloutPercent: 50
};

const DEFAULT_CONSTRAINT = {
  operator: "EQ",
  property: "",
  value: ""
};

const DEFAULT_VARIANT = {
  key: ""
};

const SAFE_KEY_REGEX = /^[\w\d\-/.:]+$/;
const SAFE_VALUE_REGEX = /^[ \w\d\-/.:]+$/;
const MAX_KEY_LENGTH = 63;

const DEFAULT_TAG = {
  value: ""
};

const DEFAULT_DISTRIBUTION = {
  bitmap: "",
  variantID: 0,
  variantKey: "",
  percent: 0
};

function processSegment(segment) {
  segment.newConstraint = structuredClone(DEFAULT_CONSTRAINT);
}

function constraintValueHint(operator, value) {
  if (!value || !value.trim()) return "Value is required";
  const v = value.trim();
  switch (operator) {
    case "IN":
    case "NOTIN":
      try { const arr = JSON.parse(v); if (!Array.isArray(arr)) return "Must be a JSON array, e.g. [\"a\",\"b\"]"; }
      catch { return "Must be a valid JSON array"; }
      break;
    case "LT":
    case "LTE":
    case "GT":
    case "GTE":
      if (isNaN(Number(v))) return "Must be a number";
      break;
    case "EREG":
    case "NEREG":
      try { new RegExp(v.replace(/^"|"$/g, "")); }
      catch { return "Invalid regex pattern"; }
      break;
  }
  return "";
}

function processVariant(variant) {
  if (typeof variant.attachment === "string") {
    variant.attachment = JSON.parse(variant.attachment);
  }
}

function handleAttachmentChange(variant, content, contentErrors) {
  variant.attachmentValid = !(contentErrors && contentErrors.parseError);
}

const route = useRoute();
const router = useRouter();

// Clipboard (Step 8a)
const { copied: idCopied, copy: copyIdFn } = useClipboard();
const { copied: keyCopied, copy: copyKeyFn } = useClipboard();

function copyId() {
  copyIdFn(route.params.flagId.toString());
}
function copyKey() {
  copyKeyFn(flag.value.key || '');
}

// Platform detection for Ctrl/Cmd label
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

const loaded = ref(false);
const dialogDeleteFlagVisible = ref(false);
const dialogEditDistributionOpen = ref(false);
const dialogCreateSegmentOpen = ref(false);
const entityTypes = ref([]);
const allTags = ref([]);
const allowCreateEntityType = ref(true);
const tagInputVisible = ref(false);
const flag = ref({
  createdBy: "",
  dataRecordsEnabled: false,
  entityType: "",
  description: "",
  enabled: false,
  id: 0,
  key: "",
  tags: [],
  segments: [],
  updatedAt: "",
  variants: [],
  notes: ""
});
const { isDirty, takeSnapshot } = useDirtyState(flag);

const newSegment = ref(structuredClone(DEFAULT_SEGMENT));
const newVariant = ref(structuredClone(DEFAULT_VARIANT));
const newTag = ref(structuredClone(DEFAULT_TAG));
const selectedSegment = ref(null);
const newDistributions = reactive({});
const operatorOptions = operators;
const showMdEditor = ref(false);
const historyLoaded = ref(false);
const deleteFlagKeyConfirm = ref("");

const { loading: savingFlag, execute: execSaveFlag } = useAsyncAction();
const { loading: creatingVariant, execute: execCreateVariant } = useAsyncAction();
const { loading: savingVariant, execute: execSaveVariant } = useAsyncAction();
const { loading: savingDistribution, execute: execSaveDistribution } = useAsyncAction();
const { loading: creatingSegment, execute: execCreateSegment } = useAsyncAction();
const { loading: savingSegment, execute: execSaveSegment } = useAsyncAction();
const { execute: execReorderSegments } = useAsyncAction();
const { loading: deletingFlag, execute: execDeleteFlag } = useAsyncAction();
const drag = ref(false);
const saveTagInput = ref(null);

const newDistributionPercentageSum = computed(() => {
  return sum(pluck(Object.values(newDistributions), "percent"));
});

const newDistributionIsValid = computed(() => {
  return newDistributionPercentageSum.value === 100;
});

const flagId = computed(() => {
  return route.params.flagId;
});

const newVariantKeyError = computed(() => {
  const key = newVariant.value.key;
  if (!key) return "";
  if (key.length > MAX_KEY_LENGTH) return `Key must be at most ${MAX_KEY_LENGTH} characters`;
  if (!SAFE_KEY_REGEX.test(key)) return "Key must contain only letters, numbers, hyphens, slashes, dots, colons";
  return "";
});

const newTagError = computed(() => {
  const val = newTag.value.value;
  if (!val) return "";
  if (val.length > MAX_KEY_LENGTH) return `Tag must be at most ${MAX_KEY_LENGTH} characters`;
  if (!SAFE_VALUE_REGEX.test(val)) return "Tag must contain only letters, numbers, spaces, hyphens, slashes, dots, colons";
  return "";
});

const toggleInnerConfigCard = computed(() => {
  if (!showMdEditor.value && !flag.value.notes) {
    return "flag-inner-config-card";
  } else {
    return "";
  }
});

function deleteFlag() {
  execDeleteFlag(() => Axios.delete(`${API_URL}/flags/${flagId.value}`), {
    onSuccess() {
      router.replace({ name: "home" });
      ElMessage.success("Flag deleted");
    }
  });
}

function putFlag(f) {
  execSaveFlag(() => Axios.put(`${API_URL}/flags/${flagId.value}`, {
    description: f.description,
    dataRecordsEnabled: f.dataRecordsEnabled,
    key: f.key || "",
    entityType: f.entityType || "",
    notes: f.notes || ""
  }), {
    onSuccess() {
      ElMessage.success("Flag updated");
      nextTick(() => takeSnapshot());
    }
  });
}

function setFlagEnabled(checked) {
  Axios.put(`${API_URL}/flags/${flagId.value}/enabled`, {
    enabled: checked
  }).then(() => {
    ElMessage.success(`Flag ${checked ? "enabled" : "disabled"}`);
  }, (err) => {
    flag.value.enabled = !checked;
    handleErr(err);
  });
}

function selectVariant($event, variant) {
  const checked = $event;
  if (checked) {
    const distribution = Object.assign(structuredClone(DEFAULT_DISTRIBUTION), {
      variantKey: variant.key,
      variantID: variant.id
    });
    newDistributions[variant.id] = distribution;
  } else {
    delete newDistributions[variant.id];
  }
}

const checkedVariantIds = computed(() => {
  return Object.keys(newDistributions).filter(id => !!newDistributions[id]);
});

function applyPreset(preset) {
  const ids = checkedVariantIds.value;
  if (ids.length === 0) return;

  switch (preset) {
    case "even": {
      const base = Math.floor(100 / ids.length);
      const remainder = 100 % ids.length;
      ids.forEach((id, i) => {
        newDistributions[id].percent = base + (i < remainder ? 1 : 0);
      });
      break;
    }
    case "control": {
      ids.forEach((id, i) => {
        newDistributions[id].percent = i === 0 ? 100 : 0;
      });
      break;
    }
    case "canary": {
      if (ids.length < 2) return;
      ids.forEach((id, i) => {
        newDistributions[id].percent = i === 0 ? 1 : i === 1 ? 99 : 0;
      });
      break;
    }
    case "gradual": {
      if (ids.length < 2) return;
      ids.forEach((id, i) => {
        newDistributions[id].percent = i === 0 ? 10 : i === 1 ? 90 : 0;
      });
      break;
    }
  }
}

function editDistribution(segment) {
  selectedSegment.value = segment;

  // Clear all keys from reactive object
  Object.keys(newDistributions).forEach(key => delete newDistributions[key]);

  segment.distributions.forEach(distribution => {
    newDistributions[distribution.variantID] = JSON.parse(JSON.stringify(distribution));
  });

  dialogEditDistributionOpen.value = true;
}

function saveDistribution(segment) {
  const distributions = Object.values(toRaw(newDistributions)).filter(
    distribution => distribution.percent !== 0
  ).map(distribution => {
    const dist = JSON.parse(JSON.stringify(distribution));
    delete dist.id;
    return dist;
  });

  execSaveDistribution(() => Axios.put(
    `${API_URL}/flags/${flagId.value}/segments/${segment.id}/distributions`,
    { distributions }
  ), {
    onSuccess(response) {
      let updatedDistributions = response.data;
      selectedSegment.value.distributions = updatedDistributions;
      dialogEditDistributionOpen.value = false;
      ElMessage.success("Distribution updated");
    }
  });
}

function createVariant() {
  execCreateVariant(() => Axios.post(
    `${API_URL}/flags/${flagId.value}/variants`,
    newVariant.value
  ), {
    onSuccess(response) {
      let variant = response.data;
      newVariant.value = structuredClone(DEFAULT_VARIANT);
      flag.value.variants.push(variant);
      ElMessage.success("Variant created");
    }
  });
}

function deleteVariant(variant) {
  const isVariantInUse = flag.value.segments.some(segment =>
    segment.distributions.some(
      distribution => distribution.variantID === variant.id
    )
  );

  if (isVariantInUse) {
    ElMessageBox.alert(
      "This variant is being used by a segment distribution. Please remove the segment or edit the distribution in order to remove this variant.",
      "Cannot delete variant",
      { type: "warning" }
    );
    return;
  }

  ElMessageBox.confirm(
    `Delete variant '${variant.key}'?`,
    "Delete variant",
    { confirmButtonText: "OK", cancelButtonText: "Cancel", type: "warning" }
  ).then(() => {
    Axios.delete(
      `${API_URL}/flags/${flagId.value}/variants/${variant.id}`
    ).then(() => {
      ElMessage.success("Variant deleted");
      fetchFlag();
    }, handleErr);
  }).catch(() => {});
}

function putVariant(variant) {
  if (variant.attachmentValid === false) {
    ElMessage.error("variant attachment is not valid");
    return;
  }

  // Prepare payload - parse attachment if it's a string (from text mode editor)
  let payload = { ...variant };
  if (typeof payload.attachment === "string") {
    try {
      payload.attachment = JSON.parse(payload.attachment);
    } catch {
      ElMessage.error("variant attachment is not valid JSON");
      return;
    }
  }

  execSaveVariant(() => Axios.put(
    `${API_URL}/flags/${flagId.value}/variants/${variant.id}`,
    payload
  ), {
    onSuccess() { ElMessage.success("Variant updated"); }
  });
}

function createTag() {
  if (newTagError.value) {
    ElMessage.error(newTagError.value);
    return;
  }
  Axios.post(`${API_URL}/flags/${flagId.value}/tags`, newTag.value).then(
    response => {
      let tag = response.data;
      newTag.value = structuredClone(DEFAULT_TAG);
      if (!flag.value.tags.map(tag => tag.value).includes(tag.value)) {
        flag.value.tags.push(tag);
        ElMessage.success("Tag created");
      }
      tagInputVisible.value = false;
      loadAllTags();
    },
    handleErr
  );
}

function cancelCreateTag() {
  newTag.value = structuredClone(DEFAULT_TAG);
  tagInputVisible.value = false;
}

function queryTags(queryString, cb) {
  let results = allTags.value.filter(tag =>
    tag.value.toLowerCase().includes(queryString.toLowerCase())
  );
  cb(results);
}

function loadAllTags() {
  Axios.get(`${API_URL}/tags`).then(response => {
    let result = response.data;
    allTags.value = result;
  }, handleErr);
}

function showTagInput() {
  tagInputVisible.value = true;
  nextTick(() => {
    if (saveTagInput.value && saveTagInput.value.focus) {
      saveTagInput.value.focus();
    }
  });
}

function deleteTag(tag) {
  ElMessageBox.confirm(
    `Delete tag '${tag.value}'?`,
    "Delete tag",
    { confirmButtonText: "OK", cancelButtonText: "Cancel", type: "warning" }
  ).then(() => {
    Axios.delete(`${API_URL}/flags/${flagId.value}/tags/${tag.id}`).then(
      () => {
        ElMessage.success("Tag deleted");
        fetchFlag();
        loadAllTags();
      },
      handleErr
    );
  }).catch(() => {});
}

function createConstraint(segment) {
  segment.newConstraint.property = segment.newConstraint.property.trim();
  segment.newConstraint.value = segment.newConstraint.value.trim();
  Axios.post(
    `${API_URL}/flags/${flagId.value}/segments/${segment.id}/constraints`,
    segment.newConstraint
  ).then(response => {
    let constraint = response.data;
    segment.constraints.push(constraint);
    segment.newConstraint = structuredClone(DEFAULT_CONSTRAINT);
    ElMessage.success("Constraint created");
  }, handleErr);
}

function putConstraint(segment, constraint) {
  constraint.property = constraint.property.trim();
  constraint.value = constraint.value.trim();
  Axios.put(
    `${API_URL}/flags/${flagId.value}/segments/${segment.id}/constraints/${constraint.id}`,
    constraint
  ).then(() => {
    ElMessage.success("Constraint updated");
  }, handleErr);
}

function deleteConstraint(segment, constraint) {
  ElMessageBox.confirm(
    `Delete constraint '${constraint.property} ${constraint.operator}'?`,
    "Delete constraint",
    { confirmButtonText: "OK", cancelButtonText: "Cancel", type: "warning" }
  ).then(() => {
    Axios.delete(
      `${API_URL}/flags/${flagId.value}/segments/${segment.id}/constraints/${constraint.id}`
    ).then(() => {
      const index = segment.constraints.findIndex(
        c => c.id === constraint.id
      );
      segment.constraints.splice(index, 1);
      ElMessage.success("Constraint deleted");
    }, handleErr);
  }).catch(() => {});
}

function putSegment(segment) {
  execSaveSegment(() => Axios.put(`${API_URL}/flags/${flagId.value}/segments/${segment.id}`, {
    description: segment.description,
    rolloutPercent: parseInt(segment.rolloutPercent, 10)
  }), {
    onSuccess() { ElMessage.success("Segment updated"); }
  });
}

function putSegmentsReorder(segments) {
  execReorderSegments(() => Axios.put(`${API_URL}/flags/${flagId.value}/segments/reorder`, {
    segmentIDs: pluck(segments, "id")
  }), {
    onSuccess() { ElMessage.success("Segment reordered"); }
  });
}

function deleteSegment(segment) {
  ElMessageBox.confirm(
    "Delete segment? Constraints and distributions will be removed.",
    "Delete segment",
    { confirmButtonText: "OK", cancelButtonText: "Cancel", type: "warning" }
  ).then(() => {
    Axios.delete(
      `${API_URL}/flags/${flagId.value}/segments/${segment.id}`
    ).then(() => {
      const index = flag.value.segments.findIndex(el => el.id === segment.id);
      flag.value.segments.splice(index, 1);
      ElMessage.success("Segment deleted");
    }, handleErr);
  }).catch(() => {});
}

function moveSegment(segment, direction) {
  const segments = flag.value.segments;
  const index = segments.findIndex(s => s.id === segment.id);
  if (index === -1) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= segments.length) return;
  const item = segments.splice(index, 1)[0];
  segments.splice(newIndex, 0, item);
  putSegmentsReorder(segments);
}

function onDragEnd() {
  drag.value = false;
  putSegmentsReorder(flag.value.segments);
}

function createSegment() {
  execCreateSegment(() => Axios.post(
    `${API_URL}/flags/${flagId.value}/segments`,
    newSegment.value
  ), {
    onSuccess(response) {
      let segment = response.data;
      processSegment(segment);
      segment.constraints = [];
      newSegment.value = structuredClone(DEFAULT_SEGMENT);
      flag.value.segments.push(segment);
      ElMessage.success("Segment created");
      dialogCreateSegmentOpen.value = false;
    }
  });
}

function fetchFlag() {
  Axios.get(`${API_URL}/flags/${flagId.value}`).then(response => {
    let f = response.data;
    f.segments.forEach(segment => processSegment(segment));
    f.variants.forEach(variant => processVariant(variant));
    flag.value = f;
    loaded.value = true;
    nextTick(() => takeSnapshot());
  }, handleErr);
  fetchEntityTypes();
}

function fetchEntityTypes() {
  function prepareEntityTypes(entityTypes) {
    let arr = entityTypes.map(key => {
      let label = key === "" ? "<null>" : key;
      return { label: label, value: key };
    });
    if (entityTypes.indexOf("") === -1) {
      arr.unshift({ label: "<null>", value: "" });
    }
    return arr;
  }

  if (
    FLAGR_UI_POSSIBLE_ENTITY_TYPES &&
    FLAGR_UI_POSSIBLE_ENTITY_TYPES != "null"
  ) {
    let types = FLAGR_UI_POSSIBLE_ENTITY_TYPES.split(",");
    entityTypes.value = prepareEntityTypes(types);
    allowCreateEntityType.value = false;
    return;
  }

  Axios.get(`${API_URL}/flags/entity_types`).then(response => {
    entityTypes.value = prepareEntityTypes(response.data);
  }, handleErr);
}

function toggleShowMdEditor() {
  showMdEditor.value = !showMdEditor.value;
}

function handleHistoryTabClick(tab) {
  if (tab.props.label == "History" && !historyLoaded.value) {
    historyLoaded.value = true;
  }
}

onBeforeRouteLeave(async () => {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm(
        "You have unsaved changes. Leave anyway?",
        "Unsaved changes",
        { confirmButtonText: "Leave", cancelButtonText: "Stay", type: "warning" }
      );
      return true;
    } catch {
      return false;
    }
  }
  return true;
});

function onBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

// Ctrl+S / Cmd+S to save (Step 8g)
function onSaveShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (isDirty.value) {
      putFlag(flag.value);
    }
  }
}

onMounted(() => {
  fetchFlag();
  loadAllTags();
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("keydown", onSaveShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
  window.removeEventListener("keydown", onSaveShortcut);
});
</script>

<style lang="less">
h5 {
  padding: 0;
  margin: var(--flagr-space-2, 8px) 0 var(--flagr-space-1, 4px);
}

.sticky-flag-header {
  position: sticky;
  top: var(--flagr-navbar-height, 49px);
  z-index: 99;
  display: flex;
  align-items: center;
  gap: var(--flagr-space-3, 12px);
  padding: var(--flagr-space-3, 12px) var(--flagr-space-4, 16px);
  background: var(--flagr-color-bg-page);
  border-bottom: 1px solid var(--flagr-color-border);
  box-shadow: var(--flagr-shadow-sm);
  margin-bottom: var(--flagr-space-3, 12px);
  border-radius: var(--flagr-radius-sm);
}

.sticky-flag-header__key {
  font-weight: var(--flagr-font-weight-semibold, 600);
  font-size: var(--flagr-text-md, 16px);
  color: var(--flagr-color-text);
}

.sticky-flag-header__status {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.is-enabled {
    background-color: var(--flagr-color-success);
  }
  &.is-disabled {
    background-color: transparent;
    border: 2px solid var(--flagr-color-danger);
  }
}

.sticky-flag-header__actions {
  margin-left: auto;
}

.flag-enable-row {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-3, 12px);
}

.flag-enable-label {
  font-size: var(--flagr-text-xs, 12px);
  font-weight: var(--flagr-font-weight-semibold, 600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: var(--flagr-radius-full, 9999px);
  line-height: var(--flagr-line-height-tight, 1.25);

  &.is-enabled {
    color: var(--flagr-color-success);
    background-color: var(--flagr-color-success-bg);
  }
  &.is-disabled {
    color: var(--flagr-color-danger);
    background-color: var(--flagr-color-danger-bg);
  }
}

.text-right {
  text-align: right;
}

.section-heading {
  margin: var(--flagr-space-3, 10px);
  h5 {
    display: flex;
    align-items: center;
    gap: var(--flagr-space-3, 10px);
  }
}

.section-heading__label {
  /* no extra margin needed, gap handles spacing */
}

/* Copy buttons (Step 8a) */
.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--flagr-color-text-muted);
  opacity: 0.6;
  transition: opacity var(--flagr-transition-fast, 150ms ease), color var(--flagr-transition-fast, 150ms ease);
  border-radius: var(--flagr-radius-sm, 6px);

  &:hover {
    opacity: 0.9;
    color: var(--flagr-color-primary);
  }

  &--inline {
    opacity: 0.7;
  }
}

.drag-handle {
  cursor: move;
  cursor: grab;
  cursor: -webkit-grab;
  opacity: 0.4;
  transition: opacity var(--flagr-transition-fast, 150ms ease);
  display: inline-flex;
  align-items: center;
  padding: 2px;

  &:hover {
    opacity: 0.8;
  }
}

.segments-container-inner .segment {
  transition: transform 0.3s;
}

.flag-inner-config-card {
  .el-card__body {
    padding-bottom: 0px;
  }
}

.segment-constraint .el-input-group__prepend {
  min-width: 5em;
}

.segment {
  .highlightable {
    padding: 4px;
    &:hover {
      background-color: var(--flagr-color-bg-muted);
    }
  }
  .segment-constraint {
    margin-bottom: var(--flagr-space-3, 12px);
    padding: var(--flagr-space-2, 8px);
    background-color: var(--flagr-color-bg-subtle);
    border: 1px solid var(--flagr-color-border);
    border-radius: var(--flagr-radius-sm, 6px);
    transition: border-color var(--flagr-transition-fast, 150ms ease);

    &:hover {
      border-color: var(--flagr-color-border-strong);
    }
  }
  .distribution-card {
    height: auto;
    min-height: 120px;
    text-align: center;
    .el-card__body {
      padding: var(--flagr-space-3, 12px) var(--flagr-space-4, 16px);
    }
    font-size: 0.9em;
  }
}

ol.constraints-inner {
  background-color: var(--flagr-color-bg-surface);
  padding-left: 8px;
  padding-right: 8px;
  border-radius: 3px;
  border: 1px solid var(--flagr-color-border);
  li {
    padding: 3px 0;
    .el-tag {
      font-size: 0.7em;
    }
  }
}

.constraint-hint {
  font-size: var(--flagr-text-xs, 12px);
  color: var(--flagr-color-warning);
  margin-top: 2px;
  line-height: 1.3;
}

.operator-desc {
  font-size: var(--flagr-text-xs, 12px);
  color: var(--flagr-color-text-muted);
  margin-left: 8px;
}

.constraints-inputs-container {
  padding: var(--flagr-space-1, 4px) 0;
}

.variants-container-inner {
  .el-card {
    margin-bottom: var(--flagr-space-4, 16px);
  }
  .el-input-group__prepend {
    width: 2em;
  }
}

.segment-order-hint {
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-empty-text, #909399);
  margin-bottom: var(--flagr-space-2, 8px);
}

.segment-order-badge {
  font-weight: bold;
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-text-secondary, #2e4960);
  margin-right: var(--flagr-space-2, 8px);
}

.segment-rollout-row {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
}

.segment-rollout-label {
  font-size: var(--flagr-text-sm, 13px);
  white-space: nowrap;
}

.segment-description-rollout {
  margin-top: var(--flagr-space-2, 8px);
}

.edit-distribution-button {
  margin-top: var(--flagr-space-1, 4px);
}

.distribution-presets {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
  margin-bottom: var(--flagr-space-3, 12px);
  flex-wrap: wrap;
}

.distribution-presets__label {
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-empty-text, #909399);
}

.edit-distribution-alert {
  margin-top: var(--flagr-space-2, 8px);
}

.el-form-item {
  margin-bottom: var(--flagr-space-1, 4px);
}

.id-row {
  margin-bottom: var(--flagr-space-2, 8px);
}

.flag-config-card {
  .flag-content {
    margin-top: var(--flagr-space-2, 8px);
    margin-bottom: calc(-1 * var(--flagr-space-2, 8px));
    .el-input-group__prepend {
      width: 8em;
    }
  }
  .data-records-group {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--flagr-space-2, 8px);
  }

  .data-records-label {
    font-size: var(--flagr-text-xs, 0.75rem);
    white-space: nowrap;
  }
}

.variant-attachment-collapsable-title {
  margin: 0;
  font-size: 13px;
  color: var(--flagr-color-text-muted);
  width: 100%;
}

.variant-attachment-title {
  margin: 0;
  font-size: 13px;
  color: var(--flagr-color-text-muted);
}

.variant-key-input {
  margin-left: var(--flagr-space-2, 8px);
  flex: 1;
}

.save-remove-variant-row {
  padding-bottom: var(--flagr-space-1, 4px);
}

.tag-key-input {
  margin: 2.5px;
  width: 40%;
  min-width: 200px;
}

.tags-container-inner {
  margin-bottom: var(--flagr-space-2, 8px);
}

.button-new-tag {
  margin: 2.5px;
}

.input-error-msg {
  color: var(--flagr-color-danger);
  font-size: var(--flagr-text-xs, 12px);
  margin-top: 2px;
}

.is-error input {
  border-color: var(--flagr-color-danger);
}

.el-card-header .el-switch.is-checked .el-switch__core {
  background-color: var(--flagr-color-success);
}
.el-card-header .el-switch:not(.is-checked) .el-switch__core {
  background-color: var(--flagr-color-danger);
}

/* Empty state entrance animation (Step 9a) */
.card--empty {
  animation: empty-appear 0.3s ease;
}

@keyframes empty-appear {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card--empty {
    animation: none;
  }
}
</style>
