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
              <div
                class="diff-snapshot-id-change"
                :title="t('history.snapshotRevision')"
              >
                <span class="snapshot-id">#{{ diff.oldId }}</span>
                <el-icon><DArrowRight /></el-icon>
                <span class="snapshot-id">#{{ diff.newId }}</span>
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
                <span size="small">{{ t('history.updatedBy', { by: diff.updatedBy }) }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </template>
      <ul
        v-if="diff.summary.length"
        class="diff-summary"
      >
        <li
          v-for="(s, i) in diff.summary"
          :key="i"
        >
          {{ s }}
        </li>
      </ul>
      <p
        v-else
        class="diff-summary-empty"
      >
        {{ t('history.metadataOnly') }}
      </p>
      <button
        type="button"
        class="diff-toggle"
        @click="toggleDiff(diff.newId)"
      >
        {{ expandedDiffs.has(diff.newId) ? t('history.hideDiff') : t('history.showDiff') }}
      </button>
      <pre
        v-if="expandedDiffs.has(diff.newId)"
        class="diff"
        v-html="diff.flagDiff"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
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

const { t } = useI18n({ useScope: "global" });
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
      linesRemoved: d.removed,
      summary: summarizeChanges(snapshots[i].flag, snapshots[i + 1].flag)
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
      ElMessage({ message: t("history.loadError"), type: "error", duration: 5000 });
    }
  );
}

// Raw JSON diff is opt-in per snapshot; the plain-language summary is the default.
const expandedDiffs = ref(new Set());
function toggleDiff(id) {
  const s = new Set(expandedDiffs.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  expandedDiffs.value = s;
}

// Compare two arrays of entities by id, pushing add/remove lines and delegating
// per-entity field changes to onChanged(old, new).
function summarizeList(out, oldArr, newArr, addedKey, removedKey, nameFn, onChanged) {
  oldArr = oldArr || [];
  newArr = newArr || [];
  const oldById = Object.fromEntries(oldArr.map((x) => [x.id, x]));
  const newById = Object.fromEntries(newArr.map((x) => [x.id, x]));
  for (const n of newArr) {
    if (!(n.id in oldById)) out.push(t(addedKey, { name: nameFn(n) }));
    else onChanged(oldById[n.id], n);
  }
  for (const o of oldArr) {
    if (!(o.id in newById)) out.push(t(removedKey, { name: nameFn(o) }));
  }
}

// Best-effort plain-language summary of what changed between two flag snapshots.
function summarizeChanges(newFlag, oldFlag) {
  // The oldest snapshot is diffed against the {} sentinel.
  if (!oldFlag || oldFlag.id === undefined) return [t("history.flagCreated")];
  const out = [];

  if (newFlag.enabled !== oldFlag.enabled) out.push(newFlag.enabled ? t("history.flagEnabled") : t("history.flagDisabled"));
  if (newFlag.key !== oldFlag.key) out.push(t("history.keyChanged", { old: oldFlag.key, new: newFlag.key }));
  if (newFlag.description !== oldFlag.description) out.push(t("history.descriptionChanged"));
  if (newFlag.dataRecordsEnabled !== oldFlag.dataRecordsEnabled)
    out.push(newFlag.dataRecordsEnabled ? t("history.dataRecordsEnabled") : t("history.dataRecordsDisabled"));
  if ((newFlag.notes || "") !== (oldFlag.notes || "")) out.push(t("history.notesUpdated"));
  if ((newFlag.entityType || "") !== (oldFlag.entityType || ""))
    out.push(t("history.entityTypeChanged", { old: oldFlag.entityType || t("history.emDash"), new: newFlag.entityType || t("history.emDash") }));

  summarizeList(out, oldFlag.variants, newFlag.variants, "history.addedVariant", "history.removedVariant", (v) => v.key, (o, n) => {
    if (o.key !== n.key) out.push(t("history.variantRenamed", { old: o.key, new: n.key }));
    if (JSON.stringify(o.attachment || {}) !== JSON.stringify(n.attachment || {}))
      out.push(t("history.attachmentChanged", { name: n.key }));
  });

  summarizeList(out, oldFlag.segments, newFlag.segments, "history.addedSegment", "history.removedSegment", (s) => s.description || t("history.unnamed"), (o, n) => {
    const name = n.description || t("history.unnamed");
    if (o.description !== n.description) out.push(t("history.segmentRenamed", { old: o.description, new: n.description }));
    if (o.rolloutPercent !== n.rolloutPercent) out.push(t("history.rolloutChanged", { name, old: o.rolloutPercent, new: n.rolloutPercent }));
    if (JSON.stringify(o.constraints || []) !== JSON.stringify(n.constraints || [])) out.push(t("history.constraintsChanged", { name }));
    if (JSON.stringify(o.distributions || []) !== JSON.stringify(n.distributions || [])) out.push(t("history.distributionChanged", { name }));
  });

  const oldTags = (oldFlag.tags || []).map((x) => x.value);
  const newTags = (newFlag.tags || []).map((x) => x.value);
  newTags.filter((x) => !oldTags.includes(x)).forEach((tag) => out.push(t("history.tagAdded", { tag })));
  oldTags.filter((x) => !newTags.includes(x)).forEach((tag) => out.push(t("history.tagRemoved", { tag })));

  return out;
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
    `<span class="diff-fold">${escapeHtml(t("history.unchangedLines", { n: hidden }, hidden))}</span>`
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
    return { html: t("history.noChanges"), added: 0, removed: 0 };
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
.diff-summary {
  list-style: none;
  margin: 0 0 var(--flagr-space-3, 12px);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--flagr-space-1, 4px);
}
.diff-summary li {
  position: relative;
  padding-left: var(--flagr-space-4, 16px);
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-text);
}
.diff-summary li::before {
  content: "›";
  position: absolute;
  left: 2px;
  color: var(--flagr-color-primary);
  font-weight: var(--flagr-font-weight-bold, 700);
}
.diff-summary-empty {
  margin: 0 0 var(--flagr-space-3, 12px);
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-color-text-muted);
  font-style: italic;
}
.diff-toggle {
  border: 0;
  background: transparent;
  padding: 0;
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-xs, 12px);
  color: var(--flagr-color-text-secondary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.diff-toggle:hover {
  color: var(--flagr-color-primary);
}
.snapshot-container {
  .diff-snapshot-id-change {
    display: flex;
    align-items: center;
    gap: var(--flagr-space-2, 8px);
    font-family: var(--flagr-font-mono);
    font-size: var(--flagr-text-sm, 13px);
    color: var(--flagr-color-text-muted);
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
