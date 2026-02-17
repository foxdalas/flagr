<template>
  <div>
    <el-card
      v-for="diff in diffs"
      :key="diff.timestamp"
      class="snapshot-container"
    >
      <template #header>
        <div class="el-card-header">
          <el-row>
            <el-col :span="14">
              <div class="diff-snapshot-id-change">
                <el-tag :disable-transitions="true">
                  Snapshot ID: {{ diff.oldId }}
                </el-tag>
                <el-icon><DArrowRight /></el-icon>
                <el-tag :disable-transitions="true">
                  Snapshot ID: {{ diff.newId }}
                </el-tag>
              </div>
            </el-col>
            <el-col
              :span="10"
              class="snapshot-meta"
            >
              <div :class="{ compact: diff.updatedBy }">
                <el-tooltip
                  :content="diff.relativeTime"
                  placement="top"
                  effect="light"
                >
                  <span size="small">{{ diff.timestamp }}</span>
                </el-tooltip>
              </div>
              <div
                v-if="diff.updatedBy"
                class="compact"
              >
                <span size="small">UPDATED BY: {{ diff.updatedBy }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </template>
      <pre
        class="diff"
        v-html="diff.flagDiff"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Axios from "axios";
import { diffJson, convertChangesToXML } from "diff";
import { ElMessage } from "element-plus";
import { DArrowRight } from "@element-plus/icons-vue";
import xss from "xss";

import constants from "@/constants";
import helpers from "@/helpers/helpers";

const props = defineProps({
  flagId: {
    type: Number,
    required: true,
  },
});

const { timeAgo } = helpers;

const { API_URL } = constants;

const flagSnapshots = ref([]);

const diffs = computed(() => {
  let ret = [];
  let snapshots = flagSnapshots.value.slice();
  snapshots.push({ flag: {} });
  for (let i = 0; i < snapshots.length - 1; i++) {
    ret.push({
      timestamp: new Date(snapshots[i].updatedAt).toLocaleString(),
      relativeTime: timeAgo(snapshots[i].updatedAt),
      updatedBy: snapshots[i].updatedBy,
      newId: snapshots[i].id,
      oldId: snapshots[i + 1].id || "NULL",
      flagDiff: getDiff(snapshots[i].flag, snapshots[i + 1].flag)
    });
  }
  return ret;
});

function getFlagSnapshots() {
  Axios.get(`${API_URL}/flags/${props.flagId}/snapshots`).then(
    response => {
      flagSnapshots.value = response.data;
    },
    () => {
      ElMessage({ message: "Failed to load flag snapshots", type: "error", duration: 5000 });
    }
  );
}

function getDiff(newFlag, oldFlag) {
  const o = JSON.parse(JSON.stringify(oldFlag));
  const n = JSON.parse(JSON.stringify(newFlag));
  const d = diffJson(o, n);
  if (d.length === 1) {
    return "No changes";
  }
  return xss(convertChangesToXML(d), {
    whiteList: { ins: [], del: [] },
  });
}

onMounted(() => {
  getFlagSnapshots();
});
</script>

<style lang="less">
.snapshot-meta {
  text-align: right;
  color: var(--flagr-color-text-secondary);
}
.snapshot-container {
  .diff-snapshot-id-change {
    color: var(--flagr-color-card-header-text);
    .el-tag {
      color: var(--flagr-color-text);
      background-color: var(--flagr-color-bg-surface);
    }
  }
  .diff {
    margin: 0;
    del {
      background-color: var(--flagr-color-diff-remove);
      text-decoration: none;
      &::before {
        content: "[-";
        font-weight: bold;
      }
      &::after {
        content: "-]";
        font-weight: bold;
      }
    }
    ins {
      background-color: var(--flagr-color-diff-add);
      text-decoration: none;
      &::before {
        content: "{+";
        font-weight: bold;
      }
      &::after {
        content: "+}";
        font-weight: bold;
      }
    }
    overflow-x: auto;
  }
}
</style>
