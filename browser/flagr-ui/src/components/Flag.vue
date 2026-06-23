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
          :title="t('flag.deleteFlagTitle')"
        >
          <i18n-t
            keypath="flag.deleteFlagConfirm"
            tag="p"
          >
            <template #key>
              <b>{{ flag.key }}</b>
            </template>
          </i18n-t>
          <el-input
            v-model="deleteFlagKeyConfirm"
            :placeholder="t('flag.deleteFlagKeyPlaceholder')"
          />
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="dialogDeleteFlagVisible = false">{{ t('common.cancel') }}</el-button>
              <el-button
                type="danger"
                :disabled="deleteFlagKeyConfirm !== flag.key"
                :loading="deletingFlag"
                @click.prevent="deleteFlag"
              >{{ t('common.delete') }}</el-button>
            </span>
          </template>
        </el-dialog>

        <el-dialog
          v-model="dialogEditDistributionOpen"
          destroy-on-close
          :title="t('flag.editDistributionTitle')"
        >
          <div v-if="loaded && flag">
            <div
              v-for="(variant, variantIndex) in flag.variants"
              :key="'distribution-variant-' + variant.id"
            >
              <div class="dist-variant-row">
                <el-checkbox
                  :model-value="!!newDistributions[variant.id]"
                  @change="(e) => selectVariant(e, variant)"
                />
                <span
                  class="dist-variant-swatch"
                  :style="{ backgroundColor: variantColor(variantIndex) }"
                />
                <span class="dist-variant-key">{{ variant.key }}</span>
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
            <span class="distribution-presets__label">{{ t('flag.presets') }}</span>
            <el-button
              size="small"
              @click="applyPreset('even')"
            >
              {{ t('flag.presetEven') }}
            </el-button>
            <el-button
              size="small"
              @click="applyPreset('control')"
            >
              {{ t('flag.presetControl') }}
            </el-button>
            <el-button
              size="small"
              :disabled="checkedVariantIds.length < 2"
              @click="applyPreset('canary')"
            >
              {{ t('flag.presetCanary') }}
            </el-button>
            <el-button
              size="small"
              :disabled="checkedVariantIds.length < 2"
              @click="applyPreset('gradual')"
            >
              {{ t('flag.presetGradual') }}
            </el-button>
          </div>
          <el-button
            class="width--full"
            :disabled="!newDistributionIsValid"
            :loading="savingDistribution"
            @click.prevent="() => saveDistribution(selectedSegment)"
          >
            {{ t('common.save') }}
          </el-button>

          <el-alert
            v-if="!newDistributionIsValid"
            class="edit-distribution-alert"
            :title="t('flag.distributionSumError', { sum: newDistributionPercentageSum })"
            type="error"
            show-icon
          />
        </el-dialog>

        <el-dialog
          v-model="dialogCreateSegmentOpen"
          destroy-on-close
          :title="t('flag.createSegmentTitle')"
        >
          <div>
            <p>
              <el-input
                v-model="newSegment.description"
                :placeholder="t('flag.segmentDescriptionPlaceholder')"
              />
            </p>
            <p>
              <span class="segment-rollout-label">{{ t('flag.rolloutPercent') }}</span>
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
              type="primary"
              :disabled="!newSegment.description"
              :loading="creatingSegment"
              @click.prevent="createSegment"
            >
              {{ t('flag.createSegment') }}
            </el-button>
          </div>
        </el-dialog>

        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ name: 'home' }">
            {{ t('flag.breadcrumbFlags') }}
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ flag.key || t('flag.flagN', { id: route.params.flagId }) }}</el-breadcrumb-item>
        </el-breadcrumb>

        <spinner v-if="!loaded" />

        <div v-if="loaded && flag">
          <div class="sticky-flag-header">
            <span class="sticky-flag-header__key">{{ flag.key || t('flag.flagN', { id: flag.id }) }}</span>
            <span
              class="sticky-flag-header__status"
              :class="flag.enabled ? 'is-enabled' : 'is-disabled'"
              aria-hidden="true"
            />
            <el-tag
              v-if="anyDirty"
              type="warning"
              size="small"
            >
              {{ t('flag.unsavedChanges') }}
            </el-tag>
            <div class="sticky-flag-header__actions">
              <el-tooltip
                :content="isMac ? 'Cmd+S' : 'Ctrl+S'"
                placement="bottom"
                effect="light"
              >
                <el-button
                  type="primary"
                  :disabled="!anyDirty"
                  :loading="savingAll"
                  @click="saveAll"
                >
                  {{ t('flag.saveAllChanges') }}
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <el-tabs
            v-model="activeTab"
            class="flag-config-tabs"
            @tab-click="handleHistoryTabClick"
          >
            <el-tab-pane
              name="config"
              :label="t('flag.tabConfig')"
            >
              <nav
                class="section-nav"
                :aria-label="t('flag.configSectionsAria')"
              >
                <button
                  v-for="s in sectionNav"
                  :key="s.id"
                  type="button"
                  class="section-nav__item"
                  :class="{ 'is-active': activeSection === s.id }"
                  :aria-current="activeSection === s.id ? 'true' : undefined"
                  @click="scrollToSection(s.id)"
                >
                  {{ s.label }}
                </button>
              </nav>
              <div
                v-if="flagWarnings.length"
                class="flag-warnings-summary"
                role="alert"
              >
                <el-icon><WarningFilled /></el-icon>
                <div class="flag-warnings-summary__body">
                  <strong>{{ t('flag.warningsSummary', { n: flagWarnings.length }, flagWarnings.length) }}</strong>
                  <ul>
                    <li
                      v-for="(w, i) in flagWarnings"
                      :key="i"
                    >
                      <button
                        type="button"
                        class="flag-warnings-summary__link"
                        @click="scrollToSegment(w.segId)"
                      >
                        {{ w.label }}
                      </button>
                      — {{ w.text }}
                    </li>
                  </ul>
                </div>
              </div>
              <el-card
                id="sec-flag"
                class="flag-config-card"
              >
                <template #header>
                  <div class="el-card-header">
                    <div class="flex-row">
                      <div class="flex-row-left">
                        <h2>{{ t('flag.cardFlag') }}</h2>
                      </div>
                      <div
                        v-if="flag"
                        class="flex-row-right flag-enable-row"
                      >
                        <span
                          class="flag-enable-label"
                          :class="flag.enabled ? 'is-enabled' : 'is-disabled'"
                        >
                          {{ flag.enabled ? t('flag.enabled') : t('flag.disabled') }}
                        </span>
                        <el-tooltip
                          :content="t('flag.enableDisableTooltip')"
                          placement="top"
                          effect="light"
                        >
                          <el-switch
                            v-model="flag.enabled"
                            :active-value="true"
                            :inactive-value="false"
                            :aria-label="t('flag.enableDisableAria')"
                            @change="setFlagEnabled"
                          />
                        </el-tooltip>
                      </div>
                    </div>
                  </div>
                </template>
                <p class="section-subhead">
                  {{ t('flag.flagSubhead') }}
                </p>
                <div class="flag-fields">
                  <div class="flag-fields__top">
                    <span class="flag-id-caption">
                      #{{ route.params.flagId }}
                      <el-tooltip
                        :content="t('flag.copyFlagId')"
                        placement="top"
                        effect="light"
                      >
                        <button
                          class="copy-btn"
                          :aria-label="t('flag.copyFlagIdAria')"
                          @click="copyId"
                        >
                          <el-icon :size="13">
                            <Check v-if="idCopied" />
                            <CopyDocument v-else />
                          </el-icon>
                        </button>
                      </el-tooltip>
                    </span>
                    <el-button
                      size="small"
                      :type="flagDirty ? 'primary' : ''"
                      :disabled="!flagDirty"
                      :loading="savingFlag"
                      @click="putFlag(flag)"
                    >
                      {{ t('flag.saveFlag') }}
                    </el-button>
                  </div>

                  <div class="field">
                    <label class="field__label">{{ t('flag.flagKey') }}</label>
                    <el-input
                      v-model="flag.key"
                      :placeholder="t('flag.keyPlaceholder')"
                    >
                      <template #append>
                        <el-tooltip
                          :content="t('flag.copyFlagKey')"
                          placement="top"
                          effect="light"
                        >
                          <button
                            class="copy-btn"
                            :aria-label="t('flag.copyFlagKeyAria')"
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
                  </div>

                  <div class="field">
                    <label class="field__label">{{ t('flag.description') }}</label>
                    <el-input
                      v-model="flag.description"
                      :placeholder="t('flag.description')"
                    />
                  </div>

                  <div class="field-inline">
                    <div class="data-records-group">
                      <el-switch
                        v-model="flag.dataRecordsEnabled"
                        size="small"
                        :active-value="true"
                        :inactive-value="false"
                      />
                      <span class="data-records-label">
                        {{ t('flag.dataRecords') }}
                        <el-tooltip
                          :content="t('flag.dataRecordsTooltip')"
                          placement="top-end"
                          effect="light"
                        >
                          <el-icon><InfoFilled /></el-icon>
                        </el-tooltip>
                      </span>
                    </div>
                    <div
                      v-show="!!flag.dataRecordsEnabled"
                      class="entity-type-field"
                    >
                      <span class="data-records-label">
                        {{ t('flag.entityType') }}
                        <el-tooltip
                          :content="t('flag.entityTypeTooltip')"
                          placement="top-end"
                          effect="light"
                        >
                          <el-icon><InfoFilled /></el-icon>
                        </el-tooltip>
                      </span>
                      <el-select
                        v-model="flag.entityType"
                        size="small"
                        filterable
                        :allow-create="allowCreateEntityType"
                        default-first-option
                        :placeholder="t('flag.entityTypePlaceholder')"
                      >
                        <el-option
                          v-for="item in entityTypes"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"
                        />
                      </el-select>
                    </div>
                  </div>
                  <div class="field">
                    <div class="field-head">
                      <span class="field__label">{{ t('flag.flagNotes') }}</span>
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
                        <span>{{ !showMdEditor ? t('flag.edit') : t('flag.view') }}</span>
                      </el-button>
                    </div>
                    <markdown-editor
                      v-model:markdown="flag.notes"
                      :show-editor="showMdEditor"
                    />
                  </div>
                  <div class="field">
                    <span class="field__label">{{ t('flag.tags') }}</span>
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
                          :placeholder="t('flag.tagPlaceholder')"
                          :trigger-on-focus="false"
                          :fetch-suggestions="queryTags"
                          @select="createTag"
                          @keyup.enter="createTag"
                          @keyup.esc="cancelCreateTag"
                          @blur="onTagInputBlur"
                        />
                        <el-tooltip
                          :content="t('flag.cancelEsc')"
                          placement="top"
                          effect="light"
                        >
                          <button
                            class="tag-cancel-btn"
                            :aria-label="t('flag.cancelAddTagAria')"
                            @mousedown.prevent
                            @click="cancelCreateTag"
                          >
                            <el-icon><Close /></el-icon>
                          </button>
                        </el-tooltip>
                      </div>
                      <el-button
                        v-else
                        class="button-new-tag"
                        size="small"
                        @click="showTagInput"
                      >
                        {{ t('flag.newTag') }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </el-card>

              <el-card
                id="sec-variants"
                class="variants-container"
              >
                <template #header>
                  <div class="clearfix">
                    <h2>{{ t('flag.cardVariants') }}</h2>
                  </div>
                </template>
                <p class="section-subhead">
                  {{ t('flag.variantsSubhead') }}
                </p>
                <div
                  v-if="flag.variants.length"
                  class="variants-container-inner"
                >
                  <div
                    v-for="variant in flag.variants"
                    :key="variant.id"
                    class="variant-item"
                  >
                    <div class="variant-item__top">
                      <span class="entity-id-caption">#{{ variant.id }}</span>
                      <div class="save-remove-variant-row">
                        <el-button
                          size="small"
                          :type="isVariantDirty(variant) ? 'primary' : ''"
                          :disabled="!isVariantDirty(variant)"
                          :loading="savingVariant"
                          @click="putVariant(variant)"
                        >
                          {{ t('flag.saveVariant') }}
                        </el-button>
                        <el-tooltip
                          :content="t('flag.deleteVariantTooltip')"
                          placement="top"
                          effect="light"
                        >
                          <el-button
                            size="small"
                            :aria-label="t('flag.deleteVariantTooltip')"
                            @click="deleteVariant(variant)"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </el-tooltip>
                      </div>
                    </div>
                    <div class="field">
                      <label class="field__label">{{ t('flag.variantKey') }}</label>
                      <el-input
                        v-model="variant.key"
                        class="variant-key-input"
                        :placeholder="t('flag.keyPlaceholder')"
                      />
                    </div>
                    <el-collapse class="variant-attachment-collapse">
                      <el-collapse-item
                        :title="t('flag.variantAttachment')"
                        class="variant-attachment-collapsable-title"
                      >
                        <p class="variant-attachment-title">
                          {{ t('flag.variantAttachmentHint') }}
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
                    {{ t('flag.noVariantsTitle') }}
                  </div>
                  <div class="empty-hint">
                    {{ t('flag.noVariantsHint') }}
                  </div>
                </div>
                <div class="variants-input">
                  <div class="flex-row equal-width constraints-inputs-container">
                    <div>
                      <el-input
                        v-model="newVariant.key"
                        :placeholder="t('flag.variantKeyPlaceholder')"
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
                    type="primary"
                    :disabled="!newVariant.key || !!newVariantKeyError"
                    :loading="creatingVariant"
                    @click.prevent="createVariant"
                  >
                    {{ t('flag.createVariant') }}
                  </el-button>
                </div>
              </el-card>

              <el-card
                id="sec-segments"
                class="segments-container"
              >
                <template #header>
                  <div class="el-card-header">
                    <div class="flex-row">
                      <div class="flex-row-left">
                        <h2>{{ t('flag.cardSegments') }}</h2>
                      </div>
                      <div class="flex-row-right">
                        <el-button @click="dialogCreateSegmentOpen = true">
                          {{ t('flag.newSegment') }}
                        </el-button>
                      </div>
                    </div>
                  </div>
                </template>
                <p class="section-subhead">
                  {{ t('flag.segmentsSubhead') }}
                </p>
                <div
                  v-if="flag.segments.length"
                  class="segment-order-hint"
                >
                  {{ t('flag.segmentOrderHint') }}
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
                      <div
                        :id="'seg-' + segment.id"
                        class="segment"
                      >
                        <div class="flex-row id-row">
                          <div class="flex-row-left">
                            <span class="drag-handle">
                              <el-icon><Rank /></el-icon>
                            </span>
                            <span class="segment-order-badge">[{{ segmentIndex + 1 }}]</span>
                            <span class="entity-id-caption">#{{ segment.id }}</span>
                          </div>
                          <div class="flex-row-right">
                            <el-button
                              size="small"
                              :type="isSegmentDirty(segment) ? 'primary' : ''"
                              :disabled="!isSegmentDirty(segment)"
                              :loading="savingSegment"
                              @click="putSegment(segment)"
                            >
                              {{ t('flag.saveSegment') }}
                            </el-button>
                            <el-tooltip
                              :content="t('flag.deleteSegmentTooltip')"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                :aria-label="t('flag.deleteSegmentTooltip')"
                                @click="deleteSegment(segment)"
                              >
                                <el-icon><Delete /></el-icon>
                              </el-button>
                            </el-tooltip>
                            <el-tooltip
                              :content="t('flag.moveUp')"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                :aria-label="t('flag.moveUpAria')"
                                :disabled="segmentIndex === 0"
                                @click="moveSegment(segment, -1)"
                              >
                                <el-icon><ArrowUp /></el-icon>
                              </el-button>
                            </el-tooltip>
                            <el-tooltip
                              :content="t('flag.moveDown')"
                              placement="top"
                              effect="light"
                            >
                              <el-button
                                size="small"
                                :aria-label="t('flag.moveDownAria')"
                                :disabled="segmentIndex === flag.segments.length - 1"
                                @click="moveSegment(segment, 1)"
                              >
                                <el-icon><ArrowDown /></el-icon>
                              </el-button>
                            </el-tooltip>
                          </div>
                        </div>
                        <div
                          v-if="segmentWarnings(segment).length"
                          class="segment-warnings"
                          role="alert"
                        >
                          <el-icon><WarningFilled /></el-icon>
                          <ul>
                            <li
                              v-for="(w, i) in segmentWarnings(segment)"
                              :key="i"
                            >
                              {{ w }}
                            </li>
                          </ul>
                        </div>
                        <div class="segment-meta">
                          <div class="field segment-desc-field">
                            <label class="field__label">{{ t('flag.description') }}</label>
                            <el-input
                              v-model="segment.description"
                              :placeholder="t('flag.description')"
                            />
                          </div>
                          <div class="field segment-rollout-field">
                            <label class="field__label">
                              {{ t('flag.rolloutPercent') }}
                              <el-tooltip
                                :content="t('flag.rolloutTooltip')"
                                placement="top"
                                effect="light"
                              >
                                <el-icon><InfoFilled /></el-icon>
                              </el-tooltip>
                            </label>
                            <el-input-number
                              v-model="segment.rolloutPercent"
                              class="segment-rollout-percent"
                              :min="0"
                              :max="100"
                              :step="1"
                              :precision="0"
                              controls-position="right"
                            />
                          </div>
                        </div>
                        <el-row>
                          <el-col :span="24">
                            <h5>{{ t('flag.constraintsTitle') }}</h5>
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
                                    :gutter="6"
                                    class="segment-constraint"
                                  >
                                    <el-col :span="8">
                                      <el-input
                                        v-model="constraint.property"
                                        size="small"
                                        :placeholder="t('flag.propertyPlaceholder')"
                                      />
                                    </el-col>
                                    <el-col :span="6">
                                      <el-select
                                        v-model="constraint.operator"
                                        class="width--full"
                                        size="small"
                                        :placeholder="t('flag.operatorPlaceholder')"
                                      >
                                        <el-option
                                          v-for="item in operatorOptions"
                                          :key="item.value"
                                          :label="item.label"
                                          :value="item.value"
                                        >
                                          <span>{{ item.label }}</span>
                                          <span class="operator-desc">{{ t('operators.' + item.value) }}</span>
                                        </el-option>
                                      </el-select>
                                    </el-col>
                                    <el-col :span="6">
                                      <el-input
                                        v-model="constraint.value"
                                        size="small"
                                        :placeholder="t('flag.constraintValuePlaceholder')"
                                      />
                                      <div
                                        v-if="constraint.value && constraintValueHint(constraint.operator, constraint.value)"
                                        class="constraint-hint"
                                        role="alert"
                                      >
                                        {{ constraintValueHint(constraint.operator, constraint.value) }}
                                      </div>
                                    </el-col>
                                    <el-col :span="2">
                                      <el-button
                                        :type="isConstraintDirty(constraint) ? 'primary' : ''"
                                        class="width--full"
                                        size="small"
                                        :disabled="!isConstraintDirty(constraint) || !!constraintValueHint(constraint.operator, constraint.value)"
                                        @click="
                                          putConstraint(segment, constraint)
                                        "
                                      >
                                        {{ t('common.save') }}
                                      </el-button>
                                    </el-col>
                                    <el-col :span="2">
                                      <el-tooltip
                                        :content="t('flag.deleteConstraintTooltip')"
                                        placement="top"
                                        effect="light"
                                      >
                                        <el-button
                                          type="danger"
                                          plain
                                          class="width--full"
                                          size="small"
                                          :aria-label="t('flag.deleteConstraintTooltip')"
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
                                  {{ t('flag.noConstraintsTitle') }}
                                </div>
                                <div class="empty-hint">
                                  {{ t('flag.noConstraintsHint') }}
                                </div>
                              </div>
                              <div>
                                <el-row
                                  :gutter="6"
                                  class="segment-constraint"
                                >
                                  <el-col :span="8">
                                    <el-input
                                      v-model="segment.newConstraint.property"
                                      size="small"
                                      :placeholder="t('flag.propertyPlaceholder')"
                                    />
                                  </el-col>
                                  <el-col :span="6">
                                    <el-select
                                      v-model="segment.newConstraint.operator"
                                      class="width--full"
                                      size="small"
                                      :placeholder="t('flag.operatorPlaceholder')"
                                    >
                                      <el-option
                                        v-for="item in operatorOptions"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value"
                                      >
                                        <span>{{ item.label }}</span>
                                        <span class="operator-desc">{{ t('operators.' + item.value) }}</span>
                                      </el-option>
                                    </el-select>
                                  </el-col>
                                  <el-col :span="6">
                                    <el-input
                                      v-model="segment.newConstraint.value"
                                      size="small"
                                      :placeholder="t('flag.valuePlaceholder')"
                                    />
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
                                      {{ t('flag.addConstraint') }}
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
                              <span>{{ t('flag.distribution') }}</span>
                              <el-tooltip
                                :content="t('flag.distributionTooltip')"
                                placement="top"
                                effect="light"
                              >
                                <el-icon class="section-info-icon"><InfoFilled /></el-icon>
                              </el-tooltip>
                              <el-button
                                round
                                size="small"
                                @click="editDistribution(segment)"
                              >
                                <el-icon><Edit /></el-icon><span>{{ t('flag.edit') }}</span>
                              </el-button>
                            </h5>
                            <DistributionBar
                              v-if="segment.distributions.length"
                              :distributions="segment.distributions"
                            />

                            <div
                              v-else
                              class="card--empty"
                            >
                              <div class="empty-icon">
                                <el-icon><DataAnalysis /></el-icon>
                              </div>
                              <div class="empty-title">
                                {{ t('flag.noDistributionTitle') }}
                              </div>
                              <div class="empty-hint">
                                {{ t('flag.noDistributionHint') }}
                              </div>
                            </div>
                          </el-col>
                        </el-row>
                      </div>
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
                    {{ t('flag.noSegmentsTitle') }}
                  </div>
                  <div class="empty-hint">
                    {{ t('flag.noSegmentsHint') }}
                  </div>
                  <el-button
                    size="small"
                    style="margin-top: 8px;"
                    @click="dialogCreateSegmentOpen = true"
                  >
                    {{ t('flag.newSegment') }}
                  </el-button>
                </div>
              </el-card>
              <debug-console
                id="sec-debug"
                :flag="flag"
              />
              <el-card id="sec-settings">
                <template #header>
                  <div class="el-card-header">
                    <h2>{{ t('flag.cardSettings') }}</h2>
                  </div>
                </template>
                <p class="section-subhead">
                  {{ t('flag.settingsSubhead') }}
                </p>
                <el-button
                  type="danger"
                  plain
                  @click="deleteFlagKeyConfirm = ''; dialogDeleteFlagVisible = true"
                >
                  <el-icon><Delete /></el-icon>
                  <span>{{ t('flag.deleteFlag') }}</span>
                </el-button>
              </el-card>
            </el-tab-pane>

            <el-tab-pane
              name="eval"
              :label="t('flag.tabEvalFlow')"
              lazy
            >
              <flag-eval-flow :flag="flag" />
            </el-tab-pane>

            <el-tab-pane
              name="history"
              :label="t('flag.tabHistory')"
            >
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
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent, toRaw } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import Axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, View, InfoFilled, ArrowUp, ArrowDown, Operation, Aim, Setting, DataAnalysis, CopyDocument, Check, Rank, Close, WarningFilled } from "@element-plus/icons-vue";

const JsonEditorVue = defineAsyncComponent(() => import("json-editor-vue"));
const FlagEvalFlow = defineAsyncComponent(() => import("@/components/FlagEvalFlow.vue"));

import constants from "@/constants";
import helpers from "@/helpers/helpers";
import { useAsyncAction } from "@/composables/useAsyncAction";
import { useClipboard } from "@/composables/useClipboard";
import Spinner from "@/components/Spinner";
import DebugConsole from "@/components/DebugConsole";
import DistributionBar from "@/components/DistributionBar.vue";
import { variantColor } from "@/composables/useVariantColors";
const FlagHistory = defineAsyncComponent(() => import("@/components/FlagHistory"));
const MarkdownEditor = defineAsyncComponent(() => import("@/components/MarkdownEditor.vue"));
import { operators } from "@/operators.json";

const { sum, pluck, handleErr } = helpers;
const { API_URL, FLAGR_UI_POSSIBLE_ENTITY_TYPES } = constants;

const { t } = useI18n({ useScope: "global" });

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

// Surface silent segment misconfigurations the user survey flagged: a 0% rollout
// (the segment matches no one — "experiment looked live but wasn't") and a
// missing distribution (matched entities receive no variant). Returned as plain
// strings, rendered in a warning banner at the top of the segment.
function segmentWarnings(segment) {
  const warnings = [];
  if (Number(segment.rolloutPercent) === 0) {
    warnings.push(t("flag.warnRollout0"));
  }
  if (!segment.distributions || segment.distributions.length === 0) {
    warnings.push(t("flag.warnNoDistribution"));
  }
  return warnings;
}

// Aggregate every segment's warnings so they can be surfaced at the top of the
// flag — you see misconfigured segments at a glance without scrolling.
const flagWarnings = computed(() => {
  const out = [];
  (flag.value?.segments || []).forEach((s, i) => {
    segmentWarnings(s).forEach((text) => {
      out.push({
        segId: s.id,
        label: `[${i + 1}]${s.description ? ` ${s.description}` : ""}`,
        text,
      });
    });
  });
  return out;
});

function scrollToSegment(segId) {
  const el = document.getElementById(`seg-${segId}`);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - SECTION_SCROLL_OFFSET;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
}

function constraintValueHint(operator, value) {
  if (!value || !value.trim()) return t("flag.hintValueRequired");
  const v = value.trim();
  const isQuoted = /^".*"$/.test(v);
  // Heuristic: the value is really a list of several values, not a single one
  // — a bracketed array, `"a","b"`, or a bare comma-separated list.
  const looksLikeList =
    /^\[.*\]$/.test(v) || /",\s*"/.test(v) || (!isQuoted && v.includes(","));

  switch (operator) {
    case "IN":
    case "NOTIN": {
      let arr;
      try { arr = JSON.parse(v); }
      catch { return t("flag.hintJsonArrayValid"); }
      // A single value (e.g. "CA" or 5) given to a list operator: point to the
      // list form, or to the single-value operator (== / !=).
      if (!Array.isArray(arr))
        return t("flag.hintInList", { eqOp: operator === "IN" ? "==" : "!=" });
      break;
    }
    case "LT":
    case "LTE":
    case "GT":
    case "GTE":
      // Quoting the number ("18") is the usual slip — comparisons want a bare number.
      if (isQuoted && v.length > 2 && !isNaN(Number(v.slice(1, -1))))
        return t("flag.hintNumberNoQuotes");
      if (isNaN(Number(v))) return t("flag.hintMustBeNumber");
      break;
    case "EREG":
    case "NEREG":
      try { new RegExp(v.replace(/^"|"$/g, "")); }
      catch { return t("flag.hintInvalidRegex"); }
      break;
    case "EQ":
    case "NEQ":
      // A list value with ==/!= silently never matches a scalar — suggest IN.
      if (looksLikeList)
        return t("flag.hintUseInForList", {
          op: operator === "EQ" ? "IN" : "NOT IN",
          sym: operator === "EQ" ? "==" : "!=",
        });
      // Text must be quoted ("CA"); an unquoted word parses as a variable and
      // silently never matches. Numbers and true/false/null are fine unquoted.
      if (!isQuoted && isNaN(Number(v)) && v !== "true" && v !== "false" && v !== "null")
        return t("flag.hintQuoteText");
      break;
    case "CONTAINS":
    case "NOTCONTAINS":
      // CONTAINS checks one substring; a list almost certainly wants IN.
      if (looksLikeList)
        return t("flag.hintUseInForList", {
          op: "IN",
          sym: operator === "CONTAINS" ? "CONTAINS" : "NOT CONTAINS",
        });
      if (!isQuoted) return t("flag.hintQuoteContains");
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
// ── Per-entity dirty tracking ──────────────────────────────
// Each editable entity keeps a JSON baseline of the fields its own Save button
// persists. "Save Flag" is enabled only by flag-level edits (flagDirty); the
// global "Unsaved changes" badge and the navigation guard light up if ANY entity
// (flag, variant, segment, constraint) has unsaved edits (anyDirty); and each
// Save resets only its own baseline — so a granular save no longer leaves a stale
// badge, and "Save Flag" no longer silently discards an unsaved variant edit.
const baselines = reactive({ flag: "", variants: {}, segments: {}, constraints: {} });

const flagFields = (f) => JSON.stringify({
  key: f.key, description: f.description, notes: f.notes,
  dataRecordsEnabled: f.dataRecordsEnabled, entityType: f.entityType,
});
const variantFields = (v) => JSON.stringify({ key: v.key, attachment: v.attachment });
const segmentFields = (s) => JSON.stringify({ description: s.description, rolloutPercent: s.rolloutPercent });
const constraintFields = (c) => JSON.stringify({ property: c.property, operator: c.operator, value: c.value });

const captureFlagBaseline = () => { baselines.flag = flagFields(flag.value); };
const captureVariantBaseline = (v) => { baselines.variants[v.id] = variantFields(v); };
const captureSegmentBaseline = (s) => { baselines.segments[s.id] = segmentFields(s); };
const captureConstraintBaseline = (c) => { baselines.constraints[c.id] = constraintFields(c); };

function captureBaselines() {
  const f = flag.value;
  if (!f) return;
  baselines.flag = flagFields(f);
  baselines.variants = {};
  baselines.segments = {};
  baselines.constraints = {};
  (f.variants || []).forEach(captureVariantBaseline);
  (f.segments || []).forEach((s) => {
    captureSegmentBaseline(s);
    (s.constraints || []).forEach(captureConstraintBaseline);
  });
}

const flagDirty = computed(() => baselines.flag !== "" && baselines.flag !== flagFields(flag.value));
const isVariantDirty = (v) => v.id in baselines.variants && baselines.variants[v.id] !== variantFields(v);
const isSegmentDirty = (s) => s.id in baselines.segments && baselines.segments[s.id] !== segmentFields(s);
const isConstraintDirty = (c) => c.id in baselines.constraints && baselines.constraints[c.id] !== constraintFields(c);

const anyDirty = computed(() => {
  const f = flag.value;
  if (!f) return false;
  if (flagDirty.value) return true;
  if ((f.variants || []).some(isVariantDirty)) return true;
  for (const s of (f.segments || [])) {
    if (isSegmentDirty(s)) return true;
    if ((s.constraints || []).some(isConstraintDirty)) return true;
  }
  return false;
});

const newSegment = ref(structuredClone(DEFAULT_SEGMENT));
const newVariant = ref(structuredClone(DEFAULT_VARIANT));
const newTag = ref(structuredClone(DEFAULT_TAG));
const selectedSegment = ref(null);
const newDistributions = reactive({});
const operatorOptions = operators;
const showMdEditor = ref(false);
const activeTab = ref("config");
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
const savingAll = ref(false);
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
  if (key.length > MAX_KEY_LENGTH) return t("flag.keyMaxLength", { max: MAX_KEY_LENGTH });
  if (!SAFE_KEY_REGEX.test(key)) return t("flag.keyInvalidChars");
  return "";
});

const newTagError = computed(() => {
  const val = newTag.value.value;
  if (!val) return "";
  if (val.length > MAX_KEY_LENGTH) return t("flag.tagMaxLength", { max: MAX_KEY_LENGTH });
  if (!SAFE_VALUE_REGEX.test(val)) return t("flag.tagInvalidChars");
  return "";
});

function deleteFlag() {
  execDeleteFlag(() => Axios.delete(`${API_URL}/flags/${flagId.value}`), {
    onSuccess() {
      router.replace({ name: "home" });
      ElMessage.success(t("flag.flagDeleted"));
    }
  });
}

function putFlag(f, { silent = false } = {}) {
  return execSaveFlag(() => Axios.put(`${API_URL}/flags/${flagId.value}`, {
    description: f.description,
    dataRecordsEnabled: f.dataRecordsEnabled,
    key: f.key || "",
    entityType: f.entityType || "",
    notes: f.notes || ""
  }), {
    onSuccess() {
      if (!silent) ElMessage.success(t("flag.flagUpdated"));
      captureFlagBaseline();
    }
  });
}

// Persist every unsaved change on the page in one action: flag fields, then each
// dirty variant, segment and constraint. Saves run sequentially (the per-type
// loading guards block concurrent calls), each failure is collected rather than
// aborting the rest, and invalid constraints are skipped so we never persist a
// bad value. One summary toast at the end.
async function saveAll() {
  if (savingAll.value || !anyDirty.value) return;
  savingAll.value = true;
  let failed = 0;
  let skipped = 0;
  const run = async (fn) => { try { await fn(); } catch { failed++; } };
  try {
    if (flagDirty.value) await run(() => putFlag(flag.value, { silent: true }));
    for (const v of flag.value.variants || []) {
      if (isVariantDirty(v)) await run(() => putVariant(v, { silent: true }));
    }
    for (const s of flag.value.segments || []) {
      if (isSegmentDirty(s)) await run(() => putSegment(s, { silent: true }));
      for (const c of s.constraints || []) {
        if (!isConstraintDirty(c)) continue;
        if (constraintValueHint(c.operator, c.value)) { skipped++; continue; }
        await run(() => putConstraint(s, c, { silent: true }));
      }
    }
    if (skipped) {
      ElMessage.warning(t("flag.savedSkipped", { n: skipped }, skipped));
    } else if (failed) {
      ElMessage.error(t("flag.savedErrors", { n: failed }, failed));
    } else {
      ElMessage.success(t("flag.allChangesSaved"));
    }
  } finally {
    savingAll.value = false;
  }
}

function setFlagEnabled(checked) {
  Axios.put(`${API_URL}/flags/${flagId.value}/enabled`, {
    enabled: checked
  }).then(() => {
    ElMessage.success(t(checked ? "flag.flagEnabled" : "flag.flagDisabled"));
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
  // On a fresh distribution no variant is selected yet; a preset should still do
  // something useful, so include all variants first instead of silently no-op'ing.
  if (checkedVariantIds.value.length === 0) {
    flag.value.variants.forEach((v) => selectVariant(true, v));
  }
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
      ElMessage.success(t("flag.distributionUpdated"));
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
      captureVariantBaseline(variant);
      ElMessage.success(t("flag.variantCreated"));
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
      t("flag.variantInUse"),
      t("flag.cannotDeleteVariant"),
      { type: "warning" }
    );
    return;
  }

  ElMessageBox.confirm(
    t("flag.deleteVariantConfirm", { key: variant.key }),
    t("flag.deleteVariantTitle"),
    { confirmButtonText: t("common.delete"), cancelButtonText: t("common.cancel"), type: "warning", confirmButtonClass: "el-button--danger" }
  ).then(() => {
    Axios.delete(
      `${API_URL}/flags/${flagId.value}/variants/${variant.id}`
    ).then(() => {
      ElMessage.success(t("flag.variantDeleted"));
      fetchFlag();
    }, handleErr);
  }).catch(() => {});
}

function putVariant(variant, { silent = false } = {}) {
  if (variant.attachmentValid === false) {
    ElMessage.error(t("flag.variantAttachmentInvalid"));
    return Promise.reject(new Error("invalid attachment"));
  }

  // Prepare payload - parse attachment if it's a string (from text mode editor)
  let payload = { ...variant };
  if (typeof payload.attachment === "string") {
    try {
      payload.attachment = JSON.parse(payload.attachment);
    } catch {
      ElMessage.error(t("flag.variantAttachmentInvalidJson"));
      return Promise.reject(new Error("invalid json"));
    }
  }

  return execSaveVariant(() => Axios.put(
    `${API_URL}/flags/${flagId.value}/variants/${variant.id}`,
    payload
  ), {
    onSuccess() {
      if (!silent) ElMessage.success(t("flag.variantUpdated"));
      captureVariantBaseline(variant);
    }
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
        ElMessage.success(t("flag.tagCreated"));
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

// Dismiss an accidentally-opened, still-empty tag input when the user clicks
// away. If they typed something we keep it open (a blur also fires when they
// click a suggestion, which must still complete via @select).
function onTagInputBlur() {
  if (!newTag.value.value.trim()) {
    setTimeout(() => {
      if (!newTag.value.value.trim()) cancelCreateTag();
    }, 120);
  }
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
    t("flag.deleteTagConfirm", { value: tag.value }),
    t("flag.deleteTagTitle"),
    { confirmButtonText: t("common.delete"), cancelButtonText: t("common.cancel"), type: "warning", confirmButtonClass: "el-button--danger" }
  ).then(() => {
    Axios.delete(`${API_URL}/flags/${flagId.value}/tags/${tag.id}`).then(
      () => {
        ElMessage.success(t("flag.tagDeleted"));
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
    captureConstraintBaseline(constraint);
    segment.newConstraint = structuredClone(DEFAULT_CONSTRAINT);
    ElMessage.success(t("flag.constraintCreated"));
  }, handleErr);
}

function putConstraint(segment, constraint, { silent = false } = {}) {
  constraint.property = constraint.property.trim();
  constraint.value = constraint.value.trim();
  return Axios.put(
    `${API_URL}/flags/${flagId.value}/segments/${segment.id}/constraints/${constraint.id}`,
    constraint
  ).then(() => {
    captureConstraintBaseline(constraint);
    if (!silent) ElMessage.success(t("flag.constraintUpdated"));
  }, (err) => { handleErr(err); throw err; });
}

function deleteConstraint(segment, constraint) {
  ElMessageBox.confirm(
    t("flag.deleteConstraintConfirm", { property: constraint.property, operator: constraint.operator }),
    t("flag.deleteConstraintTitle"),
    { confirmButtonText: t("common.delete"), cancelButtonText: t("common.cancel"), type: "warning", confirmButtonClass: "el-button--danger" }
  ).then(() => {
    Axios.delete(
      `${API_URL}/flags/${flagId.value}/segments/${segment.id}/constraints/${constraint.id}`
    ).then(() => {
      const index = segment.constraints.findIndex(
        c => c.id === constraint.id
      );
      segment.constraints.splice(index, 1);
      ElMessage.success(t("flag.constraintDeleted"));
    }, handleErr);
  }).catch(() => {});
}

function putSegment(segment, { silent = false } = {}) {
  return execSaveSegment(() => Axios.put(`${API_URL}/flags/${flagId.value}/segments/${segment.id}`, {
    description: segment.description,
    rolloutPercent: parseInt(segment.rolloutPercent, 10)
  }), {
    onSuccess() {
      if (!silent) ElMessage.success(t("flag.segmentUpdated"));
      captureSegmentBaseline(segment);
    }
  });
}

function putSegmentsReorder(segments) {
  execReorderSegments(() => Axios.put(`${API_URL}/flags/${flagId.value}/segments/reorder`, {
    segmentIDs: pluck(segments, "id")
  }), {
    onSuccess() { ElMessage.success(t("flag.segmentReordered")); }
  });
}

function deleteSegment(segment) {
  ElMessageBox.confirm(
    t("flag.deleteSegmentConfirm"),
    t("flag.deleteSegmentTitle"),
    { confirmButtonText: t("common.delete"), cancelButtonText: t("common.cancel"), type: "warning", confirmButtonClass: "el-button--danger" }
  ).then(() => {
    Axios.delete(
      `${API_URL}/flags/${flagId.value}/segments/${segment.id}`
    ).then(() => {
      const index = flag.value.segments.findIndex(el => el.id === segment.id);
      flag.value.segments.splice(index, 1);
      ElMessage.success(t("flag.segmentDeleted"));
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
      captureSegmentBaseline(segment);
      ElMessage.success(t("flag.segmentCreated"));
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
    nextTick(() => captureBaselines());
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
  if (tab.props.name === "history" && !historyLoaded.value) {
    historyLoaded.value = true;
  }
}

onBeforeRouteLeave(async () => {
  if (anyDirty.value) {
    try {
      await ElMessageBox.confirm(
        t("flag.leaveConfirm"),
        t("flag.leaveTitle"),
        { confirmButtonText: t("flag.leave"), cancelButtonText: t("flag.stay"), type: "warning" }
      );
      return true;
    } catch {
      return false;
    }
  }
  return true;
});

function onBeforeUnload(e) {
  if (anyDirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

// Ctrl+S / Cmd+S to save (Step 8g)
function onSaveShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveAll();
  }
}

// ── Config section navigation (sticky pills + scroll-spy) ──
const sectionNav = computed(() => [
  { id: "sec-flag", label: t("flag.navFlag") },
  { id: "sec-variants", label: t("flag.navVariants") },
  { id: "sec-segments", label: t("flag.navSegments") },
  { id: "sec-debug", label: t("flag.navDebug") },
  { id: "sec-settings", label: t("flag.navSettings") },
]);
const activeSection = ref("sec-flag");
// Combined height of the stuck navbar + flag header + section nav, so a clicked
// section lands just below the sticky bars rather than under them.
const SECTION_SCROLL_OFFSET = 172;
let scrollSpyRaf = null;
// While a click-triggered smooth scroll is in flight, pin the clicked section
// and suppress the position-based spy: short trailing sections (Debug/Settings)
// can't actually reach the trigger line, so the scroll clamps at the page bottom
// and the spy would otherwise snap the highlight to a later section the instant
// you click them.
let clickScrolling = false;
let clickScrollTimer = null;

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  activeSection.value = id;
  clickScrolling = true;
  if (clickScrollTimer) clearTimeout(clickScrollTimer);
  // Safety release if the target is already in place and no scroll events fire.
  clickScrollTimer = setTimeout(() => {
    clickScrolling = false;
  }, 1000);
  const y = el.getBoundingClientRect().top + window.scrollY - SECTION_SCROLL_OFFSET;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
}

// Scroll-position scroll-spy. Each section has an "activation" scroll position —
// where its top would reach the trigger line just below the sticky bars. The
// active section is the last one whose activation has been passed.
//
// Short trailing sections (Debug, Settings) can sit entirely below the line at
// max scroll, so their natural activation is beyond what the page can scroll to
// and they would never highlight. We detect those and distribute them evenly
// across the leftover scroll between the last reachable section and the bottom,
// so each still lights up on the way down.
function updateActiveSection() {
  const line = SECTION_SCROLL_OFFSET + 8;
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

  const items = sectionNav.value
    .map((s) => ({ id: s.id, el: document.getElementById(s.id) }))
    .filter((x) => x.el);
  if (!items.length) return;

  // top + scrollY is the element's offset from the document top (scroll-invariant).
  const activations = items.map(
    (x) => x.el.getBoundingClientRect().top + scrollY - line
  );

  let lastReachable = 0;
  activations.forEach((a, i) => {
    if (a <= maxScroll) lastReachable = i;
  });
  const unreachable = items.length - 1 - lastReachable;
  if (unreachable > 0) {
    const zoneStart = activations[lastReachable];
    const zone = Math.max(1, maxScroll - zoneStart);
    for (let k = 1; k <= unreachable; k++) {
      activations[lastReachable + k] = zoneStart + (zone * k) / (unreachable + 1);
    }
  }

  let idx = 0;
  activations.forEach((a, i) => {
    if (scrollY >= a - 1) idx = i;
  });
  if (scrollY >= maxScroll - 2) idx = items.length - 1;
  activeSection.value = items[idx].id;
}

function onScrollSpy() {
  // During a click-driven scroll, hold the clicked section and just keep
  // extending the lock until the scroll settles (150ms after the last event).
  if (clickScrolling) {
    if (clickScrollTimer) clearTimeout(clickScrollTimer);
    clickScrollTimer = setTimeout(() => {
      clickScrolling = false;
    }, 150);
    return;
  }
  if (scrollSpyRaf) return;
  scrollSpyRaf = requestAnimationFrame(() => {
    scrollSpyRaf = null;
    updateActiveSection();
  });
}

function setupScrollSpy() {
  window.addEventListener("scroll", onScrollSpy, { passive: true });
  window.addEventListener("resize", onScrollSpy, { passive: true });
  updateActiveSection();
}

// Sections only exist once the flag has loaded and rendered.
watch(loaded, (isLoaded) => {
  if (isLoaded) nextTick(setupScrollSpy);
});

// Reflect the open flag in the browser tab title (like the breadcrumb does).
watch(
  () => (loaded.value && flag.value ? (flag.value.key || t("flag.flagN", { id: flagId.value })) : null),
  (name) => {
    if (name) document.title = `Flagr — ${name}`;
  },
  { immediate: true }
);

onMounted(() => {
  fetchFlag();
  loadAllTags();
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("keydown", onSaveShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
  window.removeEventListener("keydown", onSaveShortcut);
  window.removeEventListener("scroll", onScrollSpy);
  window.removeEventListener("resize", onScrollSpy);
  if (scrollSpyRaf) cancelAnimationFrame(scrollSpyRaf);
  if (clickScrollTimer) clearTimeout(clickScrollTimer);
  document.title = "Flagr";
});
</script>

<style lang="less">
h5 {
  padding: 0;
  margin: var(--flagr-space-2, 8px) 0 var(--flagr-space-1, 4px);
}

/* ── Config section nav (sticky pills + scroll-spy) ── */
/* el-tabs__content defaults to overflow:hidden, which would make it the sticky
   containing block and pin the nav inside the tab box. Let it overflow so the
   nav sticks relative to the page instead. */
.flag-config-tabs > .el-tabs__content {
  overflow: visible;
}

.section-nav {
  position: sticky;
  /* Stick flush below the navbar + sticky flag header (navbar height + ~57px). */
  top: calc(var(--flagr-navbar-height, 67px) + 57px);
  z-index: 98;
  display: flex;
  flex-wrap: wrap;
  gap: var(--flagr-space-1, 4px);
  padding: var(--flagr-space-2, 8px) 0;
  margin-bottom: var(--flagr-space-3, 12px);
  background: var(--flagr-color-bg-page);
  border-bottom: 1px solid var(--flagr-color-border);
}

.section-nav__item {
  border: 0;
  background: transparent;
  padding: 4px 12px;
  border-radius: var(--flagr-radius-full, 999px);
  font-family: inherit;
  font-size: var(--flagr-text-sm, 13px);
  font-weight: var(--flagr-font-weight-medium, 500);
  color: var(--flagr-color-text-secondary);
  cursor: pointer;
  transition: background-color var(--flagr-transition-fast, 150ms ease),
    color var(--flagr-transition-fast, 150ms ease);
}

.section-nav__item:hover {
  background: var(--flagr-color-bg-muted);
  color: var(--flagr-color-text);
}

.section-nav__item.is-active {
  background: var(--flagr-color-primary-light);
  color: var(--flagr-color-primary);
}

.section-nav__item:focus-visible {
  box-shadow: var(--flagr-shadow-focus);
  outline: none;
}

.sticky-flag-header {
  position: sticky;
  top: var(--flagr-navbar-height, 67px);
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
  /* A long flag key must truncate instead of pushing the Save action off-screen
     on narrow viewports. */
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Breadcrumb: truncate a long flag key in the trailing item so it can't force
   horizontal page scroll on mobile. */
.flag-container > .el-breadcrumb {
  display: flex;
  min-width: 0;
}
.flag-container > .el-breadcrumb .el-breadcrumb__item:last-child {
  min-width: 0;
  overflow: hidden;
}
.flag-container > .el-breadcrumb .el-breadcrumb__item:last-child .el-breadcrumb__inner {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
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

/* Notes/Tags use the same .field grouping as the other form fields; this row
   holds the label next to its inline action (e.g. Flag Notes + edit). */
.field-head {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-3, 12px);
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
  /* Use the muted colour directly (no opacity dimming): opacity dropped the
     effective icon contrast to ~2.3:1, below WCAG 1.4.11 (3:1) for UI graphics.
     The muted token (~4.8:1) keeps it quiet but perceivable. */
  color: var(--flagr-color-text-muted);
  transition: color var(--flagr-transition-fast, 150ms ease);
  border-radius: var(--flagr-radius-sm, 6px);

  &:hover {
    color: var(--flagr-color-primary);
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
  transition: border-color var(--flagr-transition-fast, 150ms ease), transform 0.3s;
}

/* Flat flag form — fields stacked with labels above, no card-in-card. */
.flag-fields {
  display: flex;
  flex-direction: column;
  gap: var(--flagr-space-4, 16px);
  padding-top: var(--flagr-space-1, 4px);
}

.flag-fields__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flag-id-caption,
.entity-id-caption {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-text-muted);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  /* flex so an inline info icon (e.g. Rollout %) centres with the text instead
     of relying on vertical-align, which leaves it visibly off-centre */
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-xs, 12px);
  font-weight: var(--flagr-font-weight-medium, 500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--flagr-color-text-secondary);
}

.field-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--flagr-space-3, 12px) var(--flagr-space-6, 32px);
}

.entity-type-field {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
}

/* Quiet one-line orientation under each section heading. Body font (not the
   display grotesk) so it reads as supporting text, not a second title. */
.section-subhead {
  margin: 0 0 var(--flagr-space-4, 16px);
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-text-muted);
  line-height: 1.4;
}

/* Small help icon next to a heading/label that carries an explanatory tooltip. */
.section-info-icon {
  font-size: 14px;
  color: var(--flagr-color-text-muted);
  cursor: help;
}

/* Distribution heading: flex so the info icon and edit button centre with the
   "Distribution" label. */
.segment-distributions h5 {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
}

/* Flat segment block — matches variant/flag language (no card-in-card). The
   drag handle provides the movable affordance. */
.segment {
  padding: var(--flagr-space-4, 16px);
  margin-bottom: var(--flagr-space-3, 12px);
  background-color: var(--flagr-color-bg-surface);
  border: 1px solid var(--flagr-color-border);
  border-radius: var(--flagr-radius-md, 10px);

  &:hover {
    border-color: var(--flagr-color-border-strong);
  }

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
  margin-bottom: var(--flagr-space-2, 8px);
}

/* Flat variant block — matches the flag form language (quiet #id, label above
   the field) instead of the old card-in-card + grey prepend label. */
.variant-item {
  display: flex;
  flex-direction: column;
  gap: var(--flagr-space-3, 12px);
  padding: var(--flagr-space-4, 16px);
  margin-bottom: var(--flagr-space-3, 12px);
  background-color: var(--flagr-color-bg-surface);
  border: 1px solid var(--flagr-color-border);
  border-radius: var(--flagr-radius-md, 10px);
  transition: border-color var(--flagr-transition-fast, 150ms ease);

  &:hover {
    border-color: var(--flagr-color-border-strong);
  }
}

.variant-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* Flag-level roll-up of segment warnings, shown at the top of Config so
   misconfigured segments are visible without scrolling. */
.flag-warnings-summary {
  display: flex;
  align-items: flex-start;
  gap: var(--flagr-space-2, 8px);
  margin-bottom: var(--flagr-space-4, 16px);
  padding: var(--flagr-space-3, 12px) var(--flagr-space-4, 16px);
  background-color: var(--flagr-color-warning-bg);
  border-left: 3px solid var(--flagr-color-warning);
  border-radius: var(--flagr-radius-md, 10px);
  font-size: var(--flagr-text-sm, 13px);
  line-height: 1.5;

  > .el-icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--flagr-color-warning);
  }

  ul {
    margin: var(--flagr-space-1, 4px) 0 0;
    padding: 0;
    list-style: none;
  }

  li + li {
    margin-top: 2px;
  }
}

.flag-warnings-summary__link {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-family: var(--flagr-font-mono);
  color: var(--flagr-color-text);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: var(--flagr-color-primary);
  }

  &:focus-visible {
    box-shadow: var(--flagr-shadow-focus);
    outline: none;
    border-radius: 2px;
  }
}

/* Prominent warning banner for silent segment misconfigurations (0% rollout,
   no distribution). */
.segment-warnings {
  display: flex;
  align-items: flex-start;
  gap: var(--flagr-space-2, 8px);
  margin-bottom: var(--flagr-space-3, 12px);
  padding: var(--flagr-space-2, 8px) var(--flagr-space-3, 12px);
  background-color: var(--flagr-color-warning-bg);
  border-left: 3px solid var(--flagr-color-warning);
  border-radius: var(--flagr-radius-sm, 6px);
  font-size: var(--flagr-text-sm, 13px);
  line-height: 1.4;

  .el-icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--flagr-color-warning);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li + li {
    margin-top: 2px;
  }
}

.segment-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--flagr-space-3, 12px) var(--flagr-space-4, 16px);
  margin-bottom: var(--flagr-space-3, 12px);
}

.segment-desc-field {
  flex: 1 1 240px;
}

.segment-rollout-field {
  flex: 0 0 auto;
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

/* Variant rows in the Edit distribution dialog mirror the bar legend: a colour
   swatch (same palette as the bar) + the key, instead of a red "danger" tag
   that made every variant read as an error. */
.dist-variant-row {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
}

.dist-variant-swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.dist-variant-key {
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-text);
}

.el-form-item {
  margin-bottom: var(--flagr-space-1, 4px);
}

.id-row {
  margin-bottom: var(--flagr-space-2, 8px);
}

.flag-config-card {
  .data-records-group {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--flagr-space-2, 8px);
  }

  .data-records-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
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
  width: 100%;
}

.save-remove-variant-row {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
}

.variant-attachment-collapse {
  border-top: 1px solid var(--flagr-color-border);
}

.tags-container-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--flagr-space-2, 8px);
  margin-bottom: var(--flagr-space-2, 8px);
}

/* The global `#app .el-tag` margin (2.5px) breaks the flex gap rhythm here, so
   reset it and let the container's gap own the spacing. */
#app .tags-container-inner .el-tag {
  margin: 0;
}

.tag-key-input {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 260px;
  max-width: 100%;
}

.tag-cancel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--flagr-color-border);
  border-radius: var(--flagr-radius-sm, 6px);
  background: transparent;
  color: var(--flagr-color-text-muted);
  cursor: pointer;
  transition: background-color var(--flagr-transition-fast, 150ms ease),
    color var(--flagr-transition-fast, 150ms ease),
    border-color var(--flagr-transition-fast, 150ms ease);

  &:hover {
    background-color: var(--flagr-color-bg-muted);
    border-color: var(--flagr-color-border-strong);
    color: var(--flagr-color-text);
  }

  &:focus-visible {
    box-shadow: var(--flagr-shadow-focus);
    outline: none;
  }
}

.button-new-tag {
  margin: 0;
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

/* Below the Element Plus `sm` breakpoint (<768px) the fixed-span constraint
   columns (Property / operator / Value / Save / Delete) squash and clip. Stack
   them to full width so each input and button stays legible on small screens. */
@media (max-width: 767.98px) {
  .segment-constraint > .el-col {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card--empty {
    animation: none;
  }
}
</style>
