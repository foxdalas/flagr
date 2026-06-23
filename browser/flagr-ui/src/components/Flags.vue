<template>
  <el-row>
    <el-col
      :span="20"
      :offset="2"
    >
      <div class="flags-container container">
        <spinner v-if="!loaded" />

        <div v-if="loaded">
          <el-row>
            <el-col>
              <el-input
                v-model="newFlag.description"
                class="create-flag-input"
                :placeholder="t('flagsList.newFlagPlaceholder')"
              >
                <template #append>
                  <el-dropdown
                    split-button
                    type="primary"
                    :disabled="!newFlag.description"
                    @command="onCommandDropdown"
                    @click="createFlag"
                  >
                    {{ t('flagsList.createFlag') }}
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          command="simple_boolean_flag"
                          :disabled="!newFlag.description"
                        >
                          {{ t('flagsList.createBooleanFlag') }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-input>
            </el-col>
          </el-row>

          <el-row class="search-row">
            <el-input
              ref="searchInput"
              v-model="searchTerm"
              v-focus
              :placeholder="t('flagsList.searchPlaceholder')"
              :aria-label="t('flagsList.searchAria')"
              clearable
              :prefix-icon="Search"
            />
          </el-row>

          <div class="flags-meta">
            <span class="flags-count">
              {{ t('flagsList.count', { n: filteredFlags.length }, filteredFlags.length) }}
              <span v-if="searchTerm">{{ t('flagsList.ofTotal', { total: flags.length }) }}</span>
            </span>
          </div>

          <!-- Empty state — shown only when no results -->
          <div
            v-if="loaded && !filteredFlags.length"
            class="card--empty"
          >
            <div class="empty-icon">
              <el-icon><Search /></el-icon>
            </div>
            <div class="empty-title">
              {{ searchTerm ? t('flagsList.emptyNoMatch') : t('flagsList.emptyNone') }}
            </div>
            <div class="empty-hint">
              {{ searchTerm ? t('flagsList.emptyHintSearch') : t('flagsList.emptyHintCreate') }}
            </div>
          </div>

          <!-- Table uses v-show to stay in DOM for test compatibility -->
          <el-table
            v-show="filteredFlags.length"
            :data="paginatedFlags"
            :stripe="true"
            :highlight-current-row="false"
            :default-sort="{ prop: 'id', order: 'descending' }"
            class="width--full flags-table"
            @row-click="goToFlag"
          >
            <el-table-column
              prop="id"
              align="center"
              :label="t('flagsList.colId')"
              sortable
              :fixed="isNarrow ? false : 'left'"
              :width="isNarrow ? 72 : 95"
            />
            <el-table-column
              prop="description"
              :label="t('flagsList.colDescription')"
              :min-width="isNarrow ? 130 : 300"
            />
            <el-table-column
              v-if="!isNarrow"
              prop="tags"
              :label="t('flagsList.colTags')"
              min-width="150"
            >
              <template #default="scope">
                <el-tag
                  v-for="tag in scope.row.tags"
                  :key="tag.id"
                  disable-transitions
                >
                  {{ tag.value }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              v-if="!isNarrow"
              prop="updatedBy"
              :label="t('flagsList.colUpdatedBy')"
              sortable
              width="160"
            />
            <el-table-column
              v-if="!isNarrow"
              prop="updatedAt"
              :label="t('flagsList.colUpdatedAt')"
              sortable
              width="170"
            >
              <template #default="scope">
                <el-tooltip
                  v-if="scope.row.updatedAt"
                  :content="timeAgo(scope.row.updatedAt)"
                  placement="top"
                  effect="light"
                >
                  <span>{{ datetimeFormatter(scope.row, null, scope.row.updatedAt) }}</span>
                </el-tooltip>
                <span v-else />
              </template>
            </el-table-column>
            <el-table-column
              prop="enabled"
              :label="t('flagsList.colEnabled')"
              sortable
              align="center"
              :fixed="isNarrow ? false : 'right'"
              :width="isNarrow ? 84 : 140"
              :filters="[{ text: t('flagsList.filterEnabled'), value: true }, { text: t('flagsList.filterDisabled'), value: false }]"
              :filter-method="filterStatus"
            >
              <template #default="scope">
                <el-tag
                  :class="['status-tag', scope.row.enabled ? 'status-tag--on' : 'status-tag--off']"
                  :type="scope.row.enabled ? 'primary' : 'danger'"
                  disable-transitions
                >
                  {{ scope.row.enabled ? t('flagsList.statusOn') : t('flagsList.statusOff') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              v-if="!isNarrow"
              fixed="right"
              width="50"
              align="center"
              class-name="flag-actions-col"
            >
              <template #default="scope">
                <el-icon
                  class="flag-actions-icon"
                  :title="t('flagsList.openInNewTab')"
                  @click.stop="openFlagInNewTab(scope.row.id)"
                >
                  <TopRight />
                </el-icon>
              </template>
            </el-table-column>
          </el-table>

          <div
            v-if="filteredFlags.length > PAGE_SIZE"
            class="pagination-wrapper"
          >
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="PAGE_SIZE"
              :total="filteredFlags.length"
              layout="prev, pager, next, jumper, ->, total"
              background
            />
          </div>

          <el-collapse
            class="deleted-flags-table"
            @change="fetchDeletedFlags"
          >
            <el-collapse-item :title="t('flagsList.deletedFlags')">
              <el-table
                :data="deletedFlags"
                :stripe="true"
                :highlight-current-row="false"
                :default-sort="{ prop: 'id', order: 'descending' }"
                class="width--full"
              >
                <el-table-column
                  prop="id"
                  align="center"
                  :label="t('flagsList.colId')"
                  sortable
                  fixed
                  width="95"
                />
                <el-table-column
                  prop="description"
                  :label="t('flagsList.colDescription')"
                  min-width="300"
                />
                <el-table-column
                  prop="tags"
                  :label="t('flagsList.colTags')"
                  min-width="200"
                >
                  <template #default="scope">
                    <el-tag
                      v-for="tag in scope.row.tags"
                      :key="tag.id"
                      disable-transitions
                    >
                      {{ tag.value }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="updatedBy"
                  :label="t('flagsList.colUpdatedBy')"
                  sortable
                  width="200"
                />
                <el-table-column
                  prop="updatedAt"
                  :label="t('flagsList.colUpdatedAt')"
                  :formatter="datetimeFormatter"
                  sortable
                  width="180"
                />
                <el-table-column
                  prop="action"
                  :label="t('flagsList.colAction')"
                  align="center"
                  fixed="right"
                  width="100"
                >
                  <template #default="scope">
                    <el-button
                      type="warning"
                      size="small"
                      @click="restoreFlag(scope.row)"
                    >
                      {{ t('flagsList.restore') }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import Axios from "axios";
import { Search, TopRight } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import constants from "@/constants";
import Spinner from "@/components/Spinner";
import helpers from "@/helpers/helpers";

const { handleErr, timeAgo, formatDateUTC } = helpers;
const { API_URL } = constants;

const { t } = useI18n({ useScope: "global" });
const router = useRouter();

const loaded = ref(false);
const deletedFlagsLoaded = ref(false);
const flags = ref([]);
const deletedFlags = ref([]);
const searchTerm = ref("");
const debouncedSearchTerm = ref("");
const newFlag = ref({ description: "" });
const searchInput = ref(null);
let searchDebounceTimer = null;

const PAGE_SIZE = 50;
const currentPage = ref(1);

// On phones the fixed left/right table columns squeeze Description down to a few
// characters, so below this breakpoint we drop the secondary columns (Tags, Last
// Updated By, Updated At) and un-pin the rest — Flag ID, Description and status stay.
const isNarrow = ref(false);
let mediaQuery = null;
const onBreakpointChange = (e) => { isNarrow.value = e.matches; };

watch(searchTerm, (val) => {
  clearTimeout(searchDebounceTimer);
  if (!val) {
    debouncedSearchTerm.value = "";
    return;
  }
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchTerm.value = val;
  }, 200);
});

// created() equivalent — runs at setup time
Axios.get(`${API_URL}/flags`).then(response => {
  let data = response.data;
  loaded.value = true;
  data.reverse();
  flags.value = data;
}, handleErr);

const filteredFlags = computed(() => {
  if (debouncedSearchTerm.value) {
    return flags.value.filter(({ id, key, description, tags }) =>
      debouncedSearchTerm.value
        .split(",")
        .map(term => {
          const termLowerCase = term.toLowerCase();
          return (
            id.toString().includes(term) ||
            key.toLowerCase().includes(termLowerCase) ||
            description.toLowerCase().includes(termLowerCase) ||
            tags
              .map(tag =>
                tag.value.toLowerCase().includes(termLowerCase)
              )
              .includes(true)
          );
        })
        .every(e => e)
    );
  }
  return flags.value;
});

const paginatedFlags = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredFlags.value.slice(start, start + PAGE_SIZE);
});

watch(debouncedSearchTerm, () => { currentPage.value = 1; });

function datetimeFormatter(row, col, val) {
  return formatDateUTC(val);
}

function getFlagUrl(flagId) {
  const resolved = router.resolve({ name: "flag", params: { flagId } });
  return resolved.href;
}

function openFlagInNewTab(flagId) {
  window.open(getFlagUrl(flagId), "_blank");
}

function goToFlag(row, column, event) {
  if (event.metaKey || event.ctrlKey) {
    openFlagInNewTab(row.id);
    return;
  }
  router.push({ name: "flag", params: { flagId: row.id } });
}

function onCommandDropdown(command) {
  if (command === "simple_boolean_flag") {
    createFlag({ template: command });
  }
}

function createFlag(params) {
  if (!newFlag.value.description) {
    return;
  }
  Axios.post(`${API_URL}/flags`, {
    ...newFlag.value,
    ...(params || {})
  }).then(response => {
    let flag = response.data;
    newFlag.value.description = "";
    ElMessage.success(t('flagsList.flagCreated'));
    router.push({ name: "flag", params: { flagId: flag.id } });
  }, handleErr);
}

function restoreFlag(row) {
  ElMessageBox.confirm(t('flagsList.restoreConfirm'), t('common.warning'), {
    confirmButtonText: t('common.ok'),
    cancelButtonText: t('common.cancel'),
    type: 'warning'
  }).then(() => {
    Axios.put(`${API_URL}/flags/${row.id}/restore`).then(response => {
      let flag = response.data;
      ElMessage.success(t('flagsList.flagUpdated'));
      flags.value.push(flag);
      deletedFlags.value = deletedFlags.value.filter(function(el) {
        return el.id != flag.id;
      });
    }, handleErr);
  });
}

function fetchDeletedFlags() {
  if (!deletedFlagsLoaded.value) {
    Axios.get(`${API_URL}/flags?deleted=true`).then(response => {
      let data = response.data;
      data.reverse();
      deletedFlags.value = data;
      deletedFlagsLoaded.value = true;
    }, handleErr);
  }
}

function filterStatus(value, row) {
  return row.enabled === value;
}

// "/" keyboard shortcut to focus search (Step 8f)
function onSlashKey(e) {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    searchInput.value?.$el?.querySelector('input')?.focus();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onSlashKey);
  mediaQuery = window.matchMedia('(max-width: 768px)');
  isNarrow.value = mediaQuery.matches;
  mediaQuery.addEventListener('change', onBreakpointChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onSlashKey);
  clearTimeout(searchDebounceTimer);
  if (mediaQuery) mediaQuery.removeEventListener('change', onBreakpointChange);
});
</script>

<style lang="less">
.flags-container {
  .search-row {
    margin-top: var(--flagr-space-3, 12px);
  }

  .flags-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--flagr-space-3, 12px);
    margin-bottom: var(--flagr-space-1, 4px);
  }

  .flags-count {
    font-size: var(--flagr-text-sm, 13px);
    color: var(--flagr-color-text-muted);
  }

  /* Table polish (Step 4) */
  .flags-table {
    border: 1px solid var(--flagr-color-border);
    border-radius: var(--flagr-radius-md);
    overflow: hidden;
    margin-top: var(--flagr-space-2, 8px);
  }

  .el-table__row {
    cursor: pointer;
    transition: background-color var(--flagr-transition-fast, 150ms ease);

    &:hover {
      box-shadow: inset 3px 0 0 var(--flagr-color-primary);
    }
  }

  .el-table__header-wrapper th {
    font-weight: 600;
  }

  /* Status tag dots (Step 4) */
  .status-tag {
    border-radius: var(--flagr-radius-full);
    padding-left: 10px;
    position: relative;

    &::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
      position: relative;
      top: -1px;
    }

    &--on::before {
      background-color: currentColor;
    }

    &--off::before {
      background-color: transparent;
      border: 1.5px solid currentColor;
      width: 5px;
      height: 5px;
    }
  }

  .flag-actions-icon {
    cursor: pointer;
    color: var(--flagr-color-text-secondary);
    transition: color var(--flagr-transition-fast, 150ms ease);
    font-size: 16px;

    &:hover {
      color: var(--flagr-color-primary);
    }
  }

  .flag-actions-col .cell {
    padding: 0;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: var(--flagr-space-4, 16px);
    margin-bottom: var(--flagr-space-2, 8px);
  }

  .el-button-group .el-button--primary:first-child {
    border-right-color: var(--flagr-color-border);
  }
  .deleted-flags-table {
    margin-top: 2rem;
  }
}

/* On phones the "Create New Flag" split-button (an el-input append) squeezes
   the description field down to a few characters. Below the Element Plus `sm`
   breakpoint, wrap the append onto its own full-width row under the input. */
@media (max-width: 767.98px) {
  .create-flag-input.el-input-group {
    flex-wrap: wrap;
  }
  .create-flag-input > .el-input-group__append {
    flex: 1 0 100%;
    margin-top: var(--flagr-space-2, 8px);
    /* It is no longer an attached cell — drop the inset border + side padding. */
    box-shadow: none;
    padding: 0;
  }
  .create-flag-input > .el-input-group__append .el-dropdown,
  .create-flag-input > .el-input-group__append .el-button-group {
    width: 100%;
    display: flex;
  }
  .create-flag-input > .el-input-group__append .el-button-group > .el-button:first-child {
    flex: 1;
  }
}
</style>
