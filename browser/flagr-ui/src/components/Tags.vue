<template>
  <el-row>
    <el-col
      :span="20"
      :offset="2"
    >
      <div class="tags-container container">
        <spinner v-if="!loaded" />

        <div v-if="loaded">
          <div class="tags-meta">
            <span class="tags-count">
              {{ tags.length }} {{ tags.length === 1 ? 'tag' : 'tags' }}
            </span>
            <el-button
              type="primary"
              :icon="Plus"
              data-testid="create-tag-button"
              @click="showCreateDialog"
            >
              Create Tag
            </el-button>
          </div>

          <div
            v-if="!tags.length"
            class="card--empty"
          >
            <div class="empty-title">
              No tags yet
            </div>
            <div class="empty-hint">
              Create your first tag above
            </div>
          </div>

          <el-table
            v-show="tags.length"
            :data="tags"
            :stripe="true"
            :highlight-current-row="false"
            :default-sort="{ prop: 'id', order: 'descending' }"
            class="width--full tags-table"
          >
            <el-table-column
              prop="id"
              align="center"
              label="ID"
              sortable
              width="95"
            />
            <el-table-column
              prop="value"
              label="Name"
              sortable
              min-width="160"
            >
              <template #default="scope">
                <el-tag disable-transitions>
                  {{ scope.row.value }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="createdAt"
              label="Created At (UTC)"
              sortable
              width="180"
            >
              <template #default="scope">
                <el-tooltip
                  v-if="scope.row.createdAt"
                  :content="timeAgo(scope.row.createdAt)"
                  placement="top"
                  effect="light"
                >
                  <span>{{ datetimeFormatter(scope.row.createdAt) }}</span>
                </el-tooltip>
                <span v-else />
              </template>
            </el-table-column>
            <el-table-column
              prop="description"
              label="Description"
              min-width="320"
            >
              <template #default="scope">
                <div class="description-cell">
                  <template v-if="editingId === scope.row.id">
                    <el-input
                      v-model="editingDescription"
                      type="textarea"
                      :autosize="{ minRows: 1, maxRows: 4 }"
                      maxlength="512"
                      show-word-limit
                      class="description-input"
                    />
                    <div class="description-actions">
                      <el-button
                        type="primary"
                        size="small"
                        data-testid="save-description-button"
                        @click="saveDescription(scope.row)"
                      >
                        Save
                      </el-button>
                      <el-button
                        size="small"
                        @click="cancelEdit"
                      >
                        Cancel
                      </el-button>
                    </div>
                  </template>
                  <template v-else>
                    <span class="description-text">{{ scope.row.description || '—' }}</span>
                    <el-button
                      :icon="Edit"
                      size="small"
                      text
                      data-testid="edit-description-button"
                      @click="startEdit(scope.row)"
                    >
                      Edit
                    </el-button>
                  </template>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              fixed="right"
              align="center"
              width="90"
              label="Actions"
            >
              <template #default="scope">
                <el-button
                  :icon="Delete"
                  type="danger"
                  size="small"
                  plain
                  data-testid="delete-tag-button"
                  @click="deleteTag(scope.row)"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-col>

    <el-dialog
      v-model="createDialogVisible"
      title="Create Tag"
      width="480px"
    >
      <el-form
        label-position="top"
        @submit.prevent
      >
        <el-form-item
          label="Name"
          :error="newTagNameError"
        >
          <el-input
            v-model="newTag.value"
            placeholder="Tag name (cannot be changed later)"
            data-testid="new-tag-name"
          />
        </el-form-item>
        <el-form-item label="Description">
          <el-input
            v-model="newTag.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            maxlength="512"
            show-word-limit
            placeholder="Optional description"
            data-testid="new-tag-description"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">
          Cancel
        </el-button>
        <el-button
          type="primary"
          data-testid="confirm-create-tag"
          @click="createTag"
        >
          Create
        </el-button>
      </template>
    </el-dialog>
  </el-row>
</template>

<script setup>
import { ref, computed } from "vue";
import Axios from "axios";
import { Plus, Edit, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import constants from "@/constants";
import Spinner from "@/components/Spinner";
import helpers from "@/helpers/helpers";

const { handleErr, timeAgo } = helpers;
const { API_URL } = constants;

const SAFE_VALUE_REGEX = /^[ \w\d\-/.:]+$/;
const MAX_KEY_LENGTH = 63;
const MAX_DESCRIPTION_LENGTH = 512;

const loaded = ref(false);
const tags = ref([]);

const createDialogVisible = ref(false);
const DEFAULT_TAG = { value: "", description: "" };
const newTag = ref(structuredClone(DEFAULT_TAG));

const editingId = ref(null);
const editingDescription = ref("");

function loadTags() {
  Axios.get(`${API_URL}/tags`).then(response => {
    tags.value = response.data;
    loaded.value = true;
  }, handleErr);
}

loadTags();

const newTagNameError = computed(() => {
  const val = newTag.value.value;
  if (!val) return "";
  if (val.length > MAX_KEY_LENGTH) return `Name must be at most ${MAX_KEY_LENGTH} characters`;
  if (!SAFE_VALUE_REGEX.test(val)) return "Name must contain only letters, numbers, spaces, hyphens, slashes, dots, colons";
  return "";
});

function datetimeFormatter(val) {
  if (!val) return "";
  return val.split(".")[0].replace("T", " ").slice(0, 16);
}

function showCreateDialog() {
  newTag.value = structuredClone(DEFAULT_TAG);
  createDialogVisible.value = true;
}

function createTag() {
  if (!newTag.value.value) {
    ElMessage.error("Tag name is required");
    return;
  }
  if (newTagNameError.value) {
    ElMessage.error(newTagNameError.value);
    return;
  }
  Axios.post(`${API_URL}/tags`, newTag.value).then(response => {
    tags.value.push(response.data);
    createDialogVisible.value = false;
    ElMessage.success("Tag created");
  }, handleErr);
}

function startEdit(tag) {
  editingId.value = tag.id;
  editingDescription.value = tag.description || "";
}

function cancelEdit() {
  editingId.value = null;
  editingDescription.value = "";
}

function saveDescription(tag) {
  if (editingDescription.value.length > MAX_DESCRIPTION_LENGTH) {
    ElMessage.error(`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
    return;
  }
  Axios.put(`${API_URL}/tags/${tag.id}`, {
    description: editingDescription.value
  }).then(response => {
    const idx = tags.value.findIndex(t => t.id === tag.id);
    if (idx !== -1) {
      tags.value[idx] = response.data;
    }
    cancelEdit();
    ElMessage.success("Tag updated");
  }, handleErr);
}

function deleteTag(tag) {
  ElMessageBox.confirm(
    `Delete tag '${tag.value}'?`,
    "Delete tag",
    {
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      type: "warning"
    }
  ).then(() => {
    Axios.delete(`${API_URL}/tags/${tag.id}`).then(() => {
      tags.value = tags.value.filter(t => t.id !== tag.id);
      ElMessage.success("Tag deleted");
    }, handleErr);
  }).catch(() => {});
}
</script>

<style lang="less">
.tags-container {
  .tags-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--flagr-space-3, 12px);
    margin-bottom: var(--flagr-space-3, 12px);
  }

  .tags-count {
    color: var(--flagr-color-text-secondary);
    font-size: var(--flagr-text-sm);
  }

  .description-cell {
    display: flex;
    align-items: flex-start;
    gap: 8px;

    .description-text {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .description-input {
      flex: 1;
    }

    .description-actions {
      display: flex;
      gap: 4px;
    }
  }
}
</style>
