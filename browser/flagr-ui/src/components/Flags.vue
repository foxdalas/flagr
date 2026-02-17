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
                placeholder="Specific new flag description"
              >
                <template #prepend>
                  <el-icon><Plus /></el-icon>
                </template>
                <template #append>
                  <el-dropdown
                    split-button
                    type="primary"
                    :disabled="!newFlag.description"
                    @command="onCommandDropdown"
                    @click="createFlag"
                  >
                    Create New Flag
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          command="simple_boolean_flag"
                          :disabled="!newFlag.description"
                        >
                          Create Simple Boolean Flag
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
              placeholder="Search a flag"
              aria-label="Search flags"
              clearable
              :prefix-icon="Search"
            />
          </el-row>

          <div class="flags-meta">
            <span class="flags-count">
              {{ filteredFlags.length }} {{ filteredFlags.length === 1 ? 'flag' : 'flags' }}
              <span v-if="searchTerm">of {{ flags.length }} total</span>
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
              {{ searchTerm ? 'No flags match your search' : 'No feature flags yet' }}
            </div>
            <div class="empty-hint">
              {{ searchTerm ? 'Try a different search term' : 'Create your first flag above' }}
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
              label="Flag ID"
              sortable
              fixed
              width="95"
            />
            <el-table-column
              prop="description"
              label="Description"
              min-width="300"
            />
            <el-table-column
              prop="tags"
              label="Tags"
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
              prop="updatedBy"
              label="Last Updated By"
              sortable
              width="160"
            />
            <el-table-column
              prop="updatedAt"
              label="Updated At (UTC)"
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
              label="Enabled"
              sortable
              align="center"
              fixed="right"
              width="140"
              :filters="[{ text: 'Enabled', value: true }, { text: 'Disabled', value: false }]"
              :filter-method="filterStatus"
            >
              <template #default="scope">
                <el-tag
                  :class="['status-tag', scope.row.enabled ? 'status-tag--on' : 'status-tag--off']"
                  :type="scope.row.enabled ? 'primary' : 'danger'"
                  disable-transitions
                >
                  {{ scope.row.enabled ? "on" : "off" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              fixed="right"
              width="50"
              align="center"
              class-name="flag-actions-col"
            >
              <template #default="scope">
                <el-icon
                  class="flag-actions-icon"
                  title="Open in new tab"
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
            <el-collapse-item title="Deleted Flags">
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
                  label="Flag ID"
                  sortable
                  fixed
                  width="95"
                />
                <el-table-column
                  prop="description"
                  label="Description"
                  min-width="300"
                />
                <el-table-column
                  prop="tags"
                  label="Tags"
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
                  label="Last Updated By"
                  sortable
                  width="200"
                />
                <el-table-column
                  prop="updatedAt"
                  label="Updated At (UTC)"
                  :formatter="datetimeFormatter"
                  sortable
                  width="180"
                />
                <el-table-column
                  prop="action"
                  label="Action"
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
                      Restore
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
import Axios from "axios";
import { Search, Plus, TopRight } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import constants from "@/constants";
import Spinner from "@/components/Spinner";
import helpers from "@/helpers/helpers";

const { handleErr, timeAgo } = helpers;
const { API_URL } = constants;

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
  if (!val) return "";
  return val.split(".")[0].replace("T", " ").slice(0, 16);
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
    ElMessage.success("Flag created");
    router.push({ name: "flag", params: { flagId: flag.id } });
  }, handleErr);
}

function restoreFlag(row) {
  ElMessageBox.confirm('This will recover the deleted flag. Continue?', 'Warning', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    type: 'warning'
  }).then(() => {
    Axios.put(`${API_URL}/flags/${row.id}/restore`).then(response => {
      let flag = response.data;
      ElMessage.success(`Flag updated`);
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
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onSlashKey);
  clearTimeout(searchDebounceTimer);
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
    color: var(--flagr-color-text-muted);
    opacity: 0.5;
    transition: opacity var(--flagr-transition-fast, 150ms ease);
    font-size: 16px;

    &:hover {
      opacity: 1;
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
</style>
