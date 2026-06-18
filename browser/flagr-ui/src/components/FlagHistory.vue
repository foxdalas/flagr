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
              <div
                v-if="diff.linesAdded || diff.linesRemoved"
                class="diff-stat"
              >
                <span class="diff-stat__add">+{{ diff.linesAdded }}</span>
                <span class="diff-stat__del">−{{ diff.linesRemoved }}</span>
              </div>
              <div :class="{ compact: diff.updatedBy }">
                <el-tooltip
                  :content="diff.relativeTime"
                  placement="top"
                  effect="light"
                >
                  <span size="small">{{ diff.timestamp }} <span class="utc-tag">UTC</span></span>
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
import { diffJson } from "diff";
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

const { timeAgo, formatDateUTC } = helpers;

// How many unchanged lines of context to keep around each change before eliding.
const CONTEXT_LINES = 3;

const { API_URL } = constants;

const flagSnapshots = ref([]);

const diffs = computed(() => {
  let ret = [];
  let snapshots = flagSnapshots.value.slice();
  snapshots.push({ flag: {} });
  for (let i = 0; i < snapshots.length - 1; i++) {
    const d = buildDiff(snapshots[i].flag, snapshots[i + 1].flag);
    ret.push({
      timestamp: formatDateUTC(snapshots[i].updatedAt, true),
      relativeTime: timeAgo(snapshots[i].updatedAt),
      updatedBy: snapshots[i].updatedBy,
      newId: snapshots[i].id,
      oldId: snapshots[i + 1].id || "NULL",
      flagDiff: d.html,
      linesAdded: d.added,
      linesRemoved: d.removed
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

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// diffJson chunk values end with a trailing newline; count only real content lines.
function countLines(value) {
  return value.split("\n").filter((l) => l !== "").length;
}

// Render an unchanged chunk, eliding its middle when it's far from any change.
// keepHead/keepTail decide whether to show context after the previous change and
// before the next one (the very first/last chunks only border a change on one side).
function renderUnchanged(value, keepHead, keepTail) {
  let lines = value.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines = lines.slice(0, -1);
  const budget = (keepHead ? CONTEXT_LINES : 0) + (keepTail ? CONTEXT_LINES : 0);
  if (lines.length <= budget + 1) {
    return lines.length ? escapeHtml(lines.join("\n")) + "\n" : "";
  }
  const head = keepHead ? lines.slice(0, CONTEXT_LINES) : [];
  const tail = keepTail ? lines.slice(-CONTEXT_LINES) : [];
  const hidden = lines.length - head.length - tail.length;
  const out = [];
  if (head.length) out.push(escapeHtml(head.join("\n")));
  out.push(
    `<span class="diff-fold">⋯ ${hidden} unchanged line${hidden === 1 ? "" : "s"} ⋯</span>`
  );
  if (tail.length) out.push(escapeHtml(tail.join("\n")));
  return out.join("\n") + "\n";
}

// Build a collapsed, git-style diff (changed lines + a little context, the rest
// folded) plus a count of added/removed lines for the summary chip.
function buildDiff(newFlag, oldFlag) {
  const o = JSON.parse(JSON.stringify(oldFlag));
  const n = JSON.parse(JSON.stringify(newFlag));
  const parts = diffJson(o, n);
  let added = 0;
  let removed = 0;
  parts.forEach((p) => {
    if (p.added) added += countLines(p.value);
    else if (p.removed) removed += countLines(p.value);
  });
  if (!added && !removed) {
    return { html: "No changes", added: 0, removed: 0 };
  }
  let html = "";
  parts.forEach((part, i) => {
    if (part.added) {
      html += `<ins>${escapeHtml(part.value)}</ins>`;
    } else if (part.removed) {
      html += `<del>${escapeHtml(part.value)}</del>`;
    } else {
      html += renderUnchanged(part.value, i !== 0, i !== parts.length - 1);
    }
  });
  return {
    html: xss(html, { whiteList: { ins: [], del: [], span: ["class"] } }),
    added,
    removed,
  };
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
.utc-tag {
  font-family: var(--flagr-font-mono);
  font-size: 0.85em;
  color: var(--flagr-color-text-muted);
}
.diff-stat {
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-sm, 13px);
  margin-bottom: 2px;
  .diff-stat__add {
    color: var(--flagr-color-success);
    font-weight: var(--flagr-font-weight-semibold, 600);
  }
  .diff-stat__del {
    color: var(--flagr-color-danger);
    font-weight: var(--flagr-font-weight-semibold, 600);
    margin-left: var(--flagr-space-2, 8px);
  }
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
    font-family: var(--flagr-font-mono);
    font-size: var(--flagr-text-sm, 13px);
    line-height: 1.5;
    .diff-fold {
      display: block;
      color: var(--flagr-color-text-muted);
      font-style: italic;
      background-color: var(--flagr-color-bg-subtle);
      border-radius: var(--flagr-radius-sm, 4px);
      padding: 0 var(--flagr-space-2, 8px);
      margin: 2px 0;
      user-select: none;
    }
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
