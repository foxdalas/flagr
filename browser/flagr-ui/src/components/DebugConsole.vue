<template>
  <el-card class="dc-container">
    <template #header>
      <div class="el-card-header">
        <h2>{{ t('debug.title') }}</h2>
      </div>
    </template>
    <p class="section-subhead">
      {{ t('debug.subhead') }}
    </p>
    <el-collapse v-model="activeCollapseItems">
      <el-collapse-item
        :title="t('debug.evaluation')"
        name="evaluation"
      >
        <template v-if="activeCollapseItems.includes('evaluation')">
          <el-row :gutter="10">
            <el-col
              :xs="24"
              :sm="12"
            >
              <div class="dc-pane-head">
                <span>{{ t('debug.request') }}</span>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="postEvaluation(evalContext)"
                >
                  POST /api/v1/evaluation
                </el-button>
              </div>
              <JsonEditorVue
                v-model="evalContext"
                :mode="'text'"
                :main-menu-bar="false"
                :navigation-bar="false"
                :status-bar="false"
                class="json-editor"
              />
            </el-col>
            <el-col
              :xs="24"
              :sm="12"
            >
              <div class="dc-pane-head">
                <span>{{ t('debug.response') }}</span>
              </div>
              <JsonEditorVue
                v-model="evalResult"
                :mode="'text'"
                :main-menu-bar="false"
                :navigation-bar="false"
                :status-bar="false"
                class="json-editor"
              />
            </el-col>
          </el-row>
        </template>
      </el-collapse-item>

      <el-collapse-item
        :title="t('debug.batchEvaluation')"
        name="batch"
      >
        <template v-if="activeCollapseItems.includes('batch')">
          <el-row :gutter="10">
            <el-col
              :xs="24"
              :sm="12"
            >
              <div class="dc-pane-head">
                <span>{{ t('debug.request') }}</span>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="postEvaluationBatch(batchEvalContext)"
                >
                  POST /api/v1/evaluation/batch
                </el-button>
              </div>
              <JsonEditorVue
                v-model="batchEvalContext"
                :mode="'text'"
                :main-menu-bar="false"
                :navigation-bar="false"
                :status-bar="false"
                class="json-editor"
              />
            </el-col>
            <el-col
              :xs="24"
              :sm="12"
            >
              <div class="dc-pane-head">
                <span>{{ t('debug.response') }}</span>
              </div>
              <JsonEditorVue
                v-model="batchEvalResult"
                :mode="'text'"
                :main-menu-bar="false"
                :navigation-bar="false"
                :status-bar="false"
                class="json-editor"
              />
            </el-col>
          </el-row>
        </template>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup>
import { ref, defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import Axios from "axios";
import { ElMessage } from "element-plus";
import constants from "@/constants";

const { t } = useI18n({ useScope: "global" });

const props = defineProps({
  flag: {
    type: Object,
    required: true,
  },
});

const JsonEditorVue = defineAsyncComponent(() => import("json-editor-vue"));

const activeCollapseItems = ref([]);

const { API_URL } = constants;

// Seed a sensible request: use the flag's own entity type when it defines one,
// otherwise "user" (the common case) rather than the legacy "report" placeholder.
const evalContext = ref({
  entityID: "a1234",
  entityType: props.flag.entityType || "user",
  entityContext: {
    hello: "world"
  },
  enableDebug: true,
  flagID: props.flag.id,
  flagKey: props.flag.key
});
const evalResult = ref({});

const batchEvalContext = ref({
  entities: [
    {
      entityID: "a1234",
      entityType: props.flag.entityType || "user",
      entityContext: {
        hello: "world"
      }
    },
    {
      entityID: "a5678",
      entityType: props.flag.entityType || "user",
      entityContext: {
        hello: "world"
      }
    }
  ],
  enableDebug: true,
  flagIDs: [props.flag.id]
});
const batchEvalResult = ref({});

// The JSON editor is in text mode, so evalCtx is a JSON *string*. Axios sends a
// string body as application/x-www-form-urlencoded by default, which Flagr
// rejects with 415 — force application/json so the raw JSON is parsed correctly.
const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

function postEvaluation(evalCtx) {
  Axios.post(`${API_URL}/evaluation`, evalCtx, JSON_HEADERS).then(
    response => {
      ElMessage.success(t("debug.evalCompleted"));
      evalResult.value = response.data;
    },
    () => {
      ElMessage({ message: t("debug.evalFailed"), type: "error", duration: 5000 });
    }
  );
}

function postEvaluationBatch(batchEvalCtx) {
  Axios.post(`${API_URL}/evaluation/batch`, batchEvalCtx, JSON_HEADERS).then(
    response => {
      ElMessage.success(t("debug.evalCompleted"));
      batchEvalResult.value = response.data;
    },
    () => {
      ElMessage({ message: t("debug.evalFailed"), type: "error", duration: 5000 });
    }
  );
}
</script>

<style lang="less" scoped>
.json-editor {
  margin-top: 3px;
  :deep(.jse-main) {
    height: 400px;
  }
}
.dc-pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
}
/* When the panes stack on narrow screens, separate them vertically. */
@media (max-width: 767px) {
  .el-col + .el-col .dc-pane-head {
    margin-top: var(--flagr-space-4, 16px);
  }
}
</style>
