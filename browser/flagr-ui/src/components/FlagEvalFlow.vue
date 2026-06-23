<template>
  <div class="eval-flow">
    <!-- Tracer: drive a real evaluation and watch the path light up -->
    <div class="ef-tracer">
      <div class="ef-tracer__eyebrow">
        {{ t('eval.trace') }}
      </div>
      <p class="ef-tracer__lead">
        {{ t('eval.traceLead') }}
      </p>
      <div class="ef-tracer__form">
        <label class="ef-tracer__field">
          <span class="ef-tracer__label">{{ t('eval.entityId') }}</span>
          <el-input
            v-model="entityID"
            size="small"
            placeholder="u1"
            @keyup.enter="runTrace"
          />
        </label>
        <label class="ef-tracer__field ef-tracer__field--grow">
          <span class="ef-tracer__label">{{ t('eval.entityContext') }}</span>
          <el-input
            v-model="contextText"
            size="small"
            placeholder='{"country":"DE"}'
            @keyup.enter="runTrace"
          />
        </label>
        <el-button
          type="primary"
          size="small"
          :loading="running"
          @click="runTrace"
        >
          {{ t('eval.runTrace') }}
        </el-button>
        <el-button
          v-if="trace"
          text
          size="small"
          @click="clearTrace"
        >
          {{ t('eval.clear') }}
        </el-button>
      </div>
      <div
        v-if="trace"
        class="ef-tracer__outcome"
        :class="`ef-tracer__outcome--${outcome.type}`"
      >
        <span class="ef-tracer__outcome-icon">{{ outcomeIcon }}</span>
        <i18n-t
          v-if="outcome.type === 'variant'"
          keypath="eval.assignedVariant"
          tag="span"
        >
          <template #variant>
            <strong>{{ outcome.variantKey }}</strong>
          </template>
        </i18n-t>
        <i18n-t
          v-else-if="outcome.type === 'excluded'"
          keypath="eval.excludedByRollout"
          tag="span"
        >
          <template #s>
            <strong>{{ t('eval.excludedStrong') }}</strong>
          </template>
        </i18n-t>
        <i18n-t
          v-else-if="outcome.type === 'no-match'"
          keypath="eval.noMatchResult"
          tag="span"
        >
          <template #s>
            <strong>{{ t('eval.emptyResult') }}</strong>
          </template>
        </i18n-t>
        <i18n-t
          v-else
          keypath="eval.disabledResult"
          tag="span"
        >
          <template #s>
            <strong>{{ t('eval.emptyResult') }}</strong>
          </template>
        </i18n-t>
      </div>
    </div>

    <!-- Entry node -->
    <div class="ef-node ef-node--entry">
      <div class="ef-node__icon">
        ↓
      </div>
      <div class="ef-node__content">
        <div class="ef-node__title">
          {{ t('eval.evalRequest') }}
        </div>
        <div class="ef-node__subtitle">
          {{ trace ? entryLabel : t('eval.entryPlaceholder') }}
        </div>
      </div>
    </div>

    <div class="ef-connector" />

    <!-- Flag enabled gate -->
    <div
      class="ef-node ef-node--gate"
      :class="flag.enabled ? 'ef-node--success' : 'ef-node--danger'"
    >
      <div class="ef-node__icon">
        {{ flag.enabled ? '✓' : '✗' }}
      </div>
      <div class="ef-node__content">
        <div class="ef-node__title">
          {{ flag.enabled ? t('eval.flagEnabledTitle') : t('eval.flagDisabledTitle') }}
        </div>
      </div>
    </div>

    <template v-if="flag.enabled">
      <!-- No segments -->
      <template v-if="!flag.segments || flag.segments.length === 0">
        <div class="ef-connector" />
        <div class="ef-node ef-node--terminal">
          <div class="ef-node__content">
            <div class="ef-node__title">
              {{ t('eval.noSegmentsTitle') }}
            </div>
            <div class="ef-node__subtitle">
              {{ t('eval.noSegmentsSub') }}
            </div>
          </div>
        </div>
      </template>

      <!-- Segments -->
      <template v-else>
        <template
          v-for="(segment, idx) in flag.segments"
          :key="segment.id"
        >
          <div class="ef-connector">
            <span
              v-if="idx > 0"
              class="ef-connector__label"
            >{{ t('eval.noMatchConnector') }}</span>
          </div>

          <div
            class="ef-segment"
            :class="trace ? `ef-segment--${segmentStatus(segment)}` : ''"
          >
            <div class="ef-segment__header">
              <span class="ef-segment__rank">[{{ idx + 1 }}]</span>
              <span class="ef-segment__name">{{ segment.description || t('eval.unnamedSegment') }}</span>
              <span
                v-if="trace && segmentStatus(segment)"
                class="ef-segment__status"
                :class="`ef-segment__status--${segmentStatus(segment)}`"
              >
                {{ statusLabel(segmentStatus(segment)) }}
              </span>
              <span
                class="ef-segment__rollout"
                :class="{ 'ef-segment__rollout--zero': segment.rolloutPercent === 0 }"
              >
                {{ t('eval.rollout', { percent: segment.rolloutPercent }) }}
              </span>
            </div>

            <!-- Constraints -->
            <div class="ef-segment__section">
              <div class="ef-segment__section-title">
                {{ t('eval.constraintsAnd') }}
              </div>
              <div
                v-if="segment.constraints && segment.constraints.length"
                class="ef-constraint-pills"
              >
                <span
                  v-for="c in segment.constraints"
                  :key="c.id"
                  class="ef-pill"
                  :title="c.property + ' ' + operatorLabel(c.operator) + ' ' + c.value"
                >
                  {{ c.property }}
                  <span class="ef-pill__op">{{ operatorLabel(c.operator) }}</span>
                  {{ truncate(c.value, 24) }}
                </span>
              </div>
              <div
                v-else
                class="ef-segment__muted"
              >
                {{ t('eval.noConstraints') }}
              </div>
            </div>

            <!-- Distribution -->
            <div class="ef-segment__section">
              <div class="ef-segment__section-title">
                {{ t('eval.distribution') }}
              </div>
              <template v-if="segmentDistributions(segment).length">
                <DistributionBar
                  :distributions="segmentDistributions(segment)"
                  :highlight="segmentStatus(segment) === 'matched' ? assignedVariantKey : null"
                />
              </template>
              <div
                v-else
                class="ef-segment__muted"
              >
                {{ t('eval.noDistribution') }}
              </div>
            </div>
          </div>
        </template>

        <!-- Terminal: no match -->
        <div class="ef-connector">
          <span class="ef-connector__label">{{ t('eval.noMatchConnector') }}</span>
        </div>
        <div
          class="ef-node ef-node--terminal"
          :class="trace ? (outcome.type === 'no-match' ? 'ef-node--terminal-active' : 'ef-node--faded') : ''"
        >
          <div class="ef-node__content">
            <div class="ef-node__title">
              {{ t('eval.noMatchTitle') }}
            </div>
            <div class="ef-node__subtitle">
              {{ t('eval.emptyResultPlain') }}
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Flag disabled terminal -->
    <template v-else>
      <div class="ef-connector" />
      <div class="ef-node ef-node--terminal">
        <div class="ef-node__content">
          <div class="ef-node__title">
            {{ t('eval.flagDisabledTitle') }}
          </div>
          <div class="ef-node__subtitle">
            {{ t('eval.disabledSub') }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Axios from "axios";
import { ElMessage } from "element-plus";
import operators from "@/operators.json";
import constants from "@/constants";
import DistributionBar from "@/components/DistributionBar.vue";

const { t } = useI18n({ useScope: "global" });

const props = defineProps({
  flag: { type: Object, required: true },
});

const { API_URL } = constants;

const operatorMap = Object.fromEntries(
  operators.operators.map((op) => [op.value, op.label])
);

function operatorLabel(op) {
  return operatorMap[op] || op;
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function segmentDistributions(segment) {
  if (!segment.distributions || !segment.distributions.length) return [];
  return segment.distributions.map((d) => ({
    variantKey: d.variantKey || `variant-${d.variantID}`,
    percent: d.percent,
  }));
}

/* ── Live trace ──────────────────────────── */

const entityID = ref("u1");
const contextText = ref('{"country":"DE"}');
const running = ref(false);
const trace = ref(null);

async function runTrace() {
  let ctx;
  try {
    ctx = contextText.value.trim() ? JSON.parse(contextText.value) : {};
  } catch {
    ElMessage.error(t("eval.errInvalidJson"));
    return;
  }
  if (ctx === null || typeof ctx !== "object" || Array.isArray(ctx)) {
    ElMessage.error(t("eval.errNotObject"));
    return;
  }
  running.value = true;
  try {
    const { data } = await Axios.post(`${API_URL}/evaluation`, {
      entityID: entityID.value || undefined,
      entityContext: ctx,
      enableDebug: true,
      flagID: props.flag.id,
    });
    trace.value = data;
  } catch {
    ElMessage.error(t("eval.errEvalFailed"));
  } finally {
    running.value = false;
  }
}

function clearTrace() {
  trace.value = null;
}

// Per-segment debug messages, keyed by segmentID. Segments absent from this map
// were never reached (a prior segment's constraints already claimed the entity).
const segmentLogs = computed(() => {
  const map = {};
  const logs = trace.value?.evalDebugLog?.segmentDebugLogs || [];
  for (const l of logs) map[l.segmentID] = l.msg || "";
  return map;
});

// Classify a segment from its debug message. Mirrors eval.go / distribution.go:
// constraints decide first-match-wins; rollout then decides yes/no within it.
function segmentStatus(segment) {
  if (!trace.value) return null;
  if (!(segment.id in segmentLogs.value)) return "skipped";
  const m = segmentLogs.value[segment.id].toLowerCase();
  if (m.includes("constraint not match")) return "failed";
  if (m.includes("rollout yes")) return "matched";
  if (m.includes("rollout no")) return "excluded";
  return "error";
}

function statusLabel(status) {
  return {
    matched: t("eval.statusMatched"),
    excluded: t("eval.statusExcluded"),
    failed: t("eval.statusFailed"),
    skipped: t("eval.statusSkipped"),
    error: t("eval.statusError"),
  }[status] || "";
}

const assignedVariantKey = computed(() => trace.value?.variantKey || null);

const outcome = computed(() => {
  if (!trace.value) return null;
  if (!props.flag.enabled) return { type: "disabled" };
  if (assignedVariantKey.value) return { type: "variant", variantKey: assignedVariantKey.value };
  const excluded = (props.flag.segments || []).some((s) => segmentStatus(s) === "excluded");
  return { type: excluded ? "excluded" : "no-match" };
});

const outcomeIcon = computed(() => {
  if (!outcome.value) return "";
  return { variant: "✓", excluded: "⚠", "no-match": "∅", disabled: "✗" }[outcome.value.type] || "";
});

// Compact summary of the traced entity for the entry node.
const entryLabel = computed(() => {
  const ec = trace.value?.evalContext;
  if (!ec) return "";
  const ctx = ec.entityContext;
  let summary = ec.entityID || t("eval.random");
  if (ctx && typeof ctx === "object") {
    const parts = Object.entries(ctx).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    if (parts.length) summary += " · " + parts.join(", ");
  }
  return truncate(summary, 64);
});
</script>

<style scoped>
.eval-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 640px;
  margin: var(--flagr-space-5) auto;
  padding: var(--flagr-space-4) 0;
}

/* ── Tracer panel (signature element) ─────── */

.ef-tracer {
  width: 100%;
  margin-bottom: var(--flagr-space-5);
  padding: var(--flagr-space-4);
  border-radius: var(--flagr-radius-md);
  border: 1px solid var(--flagr-color-border);
  background: var(--flagr-color-bg-surface);
  box-shadow: var(--flagr-shadow-sm);
}

.ef-tracer__eyebrow {
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-xs);
  font-weight: var(--flagr-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--flagr-color-primary);
}

.ef-tracer__lead {
  margin: var(--flagr-space-1) 0 var(--flagr-space-3);
  font-size: var(--flagr-text-sm);
  color: var(--flagr-color-text-secondary);
}

.ef-tracer__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--flagr-space-3);
}

.ef-tracer__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.ef-tracer__field--grow {
  flex: 1;
  min-width: 200px;
}

.ef-tracer__label {
  font-size: var(--flagr-text-xs);
  font-weight: var(--flagr-font-weight-semibold);
  color: var(--flagr-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ef-tracer__outcome {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2);
  margin-top: var(--flagr-space-3);
  padding: var(--flagr-space-2) var(--flagr-space-3);
  border-radius: var(--flagr-radius-sm);
  font-size: var(--flagr-text-sm);
}

.ef-tracer__outcome-icon {
  font-weight: var(--flagr-font-weight-bold);
}

.ef-tracer__outcome--variant {
  background: var(--flagr-color-success-bg);
  color: var(--flagr-color-success);
}

.ef-tracer__outcome--excluded {
  background: var(--flagr-color-warning-bg, #fef3c7);
  color: var(--flagr-color-warning, #d97706);
}

.ef-tracer__outcome--no-match,
.ef-tracer__outcome--disabled {
  background: var(--flagr-color-bg-subtle);
  color: var(--flagr-color-text-secondary);
}

/* ── Nodes ──────────────────────────────── */

.ef-node {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-3);
  width: 100%;
  padding: var(--flagr-space-3) var(--flagr-space-4);
  border-radius: var(--flagr-radius-md);
  background: var(--flagr-color-bg-surface);
  border: 1px solid var(--flagr-color-border);
  box-shadow: var(--flagr-shadow-sm);
}

.ef-node--entry {
  background: var(--flagr-color-primary-light);
  border-color: var(--flagr-color-primary);
}

.ef-node--entry .ef-node__icon {
  color: var(--flagr-color-primary);
  font-size: var(--flagr-text-lg);
  font-weight: var(--flagr-font-weight-bold);
}

.ef-node--gate .ef-node__icon {
  font-size: var(--flagr-text-lg);
  font-weight: var(--flagr-font-weight-bold);
}

.ef-node--success {
  border-color: var(--flagr-color-success);
  background: var(--flagr-color-success-bg);
}

.ef-node--success .ef-node__icon {
  color: var(--flagr-color-success);
}

.ef-node--danger {
  border-color: var(--flagr-color-danger);
  background: var(--flagr-color-danger-bg);
}

.ef-node--danger .ef-node__icon {
  color: var(--flagr-color-danger);
}

.ef-node--terminal {
  border-style: dashed;
  border-color: var(--flagr-color-border-strong);
  background: var(--flagr-color-bg-subtle);
}

.ef-node--terminal-active {
  border-style: solid;
  border-color: var(--flagr-color-text-secondary);
  background: var(--flagr-color-bg-muted);
}

.ef-node--faded {
  opacity: 0.4;
}

.ef-node__title {
  font-weight: var(--flagr-font-weight-semibold);
  font-size: var(--flagr-text-base);
  color: var(--flagr-color-text);
}

.ef-node__subtitle {
  font-size: var(--flagr-text-sm);
  color: var(--flagr-color-text-secondary);
}

/* ── Connector ──────────────────────────── */

.ef-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 2px;
  min-height: 28px;
  background: var(--flagr-color-border-strong);
  position: relative;
}

.ef-connector__label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--flagr-text-xs);
  color: var(--flagr-color-text-muted);
  font-style: italic;
  white-space: nowrap;
}

/* ── Segment card ───────────────────────── */

.ef-segment {
  width: 100%;
  border-radius: var(--flagr-radius-md);
  border: 1px solid var(--flagr-color-border);
  background: var(--flagr-color-bg-surface);
  box-shadow: var(--flagr-shadow-sm);
  overflow: hidden;
  transition: opacity var(--flagr-transition-base), border-color var(--flagr-transition-base);
}

/* Trace states */
.ef-segment--matched {
  border-color: var(--flagr-color-success);
  box-shadow: 0 0 0 1px var(--flagr-color-success), var(--flagr-shadow-sm);
}

.ef-segment--excluded {
  border-color: var(--flagr-color-warning, #d97706);
}

.ef-segment--failed {
  opacity: 0.55;
}

.ef-segment--skipped {
  opacity: 0.4;
}

.ef-segment__header {
  display: flex;
  align-items: center;
  gap: var(--flagr-space-2);
  padding: var(--flagr-space-3) var(--flagr-space-4);
  background: var(--flagr-color-bg-subtle);
  border-bottom: 1px solid var(--flagr-color-border);
}

.ef-segment__rank {
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-sm);
  font-weight: var(--flagr-font-weight-bold);
  color: var(--flagr-color-primary);
}

.ef-segment__name {
  flex: 1;
  font-weight: var(--flagr-font-weight-semibold);
  font-size: var(--flagr-text-base);
  color: var(--flagr-color-text);
}

.ef-segment__status {
  font-family: var(--flagr-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px var(--flagr-space-2);
  border-radius: var(--flagr-radius-full);
  font-weight: var(--flagr-font-weight-semibold);
}

.ef-segment__status--matched {
  background: var(--flagr-color-success-bg);
  color: var(--flagr-color-success);
}

.ef-segment__status--excluded {
  background: var(--flagr-color-warning-bg, #fef3c7);
  color: var(--flagr-color-warning, #d97706);
}

.ef-segment__status--failed,
.ef-segment__status--skipped,
.ef-segment__status--error {
  background: var(--flagr-color-bg-muted);
  color: var(--flagr-color-text-muted);
}

.ef-segment__rollout {
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-xs);
  padding: 2px var(--flagr-space-2);
  border-radius: var(--flagr-radius-full);
  background: var(--flagr-color-success-bg);
  color: var(--flagr-color-success);
  font-weight: var(--flagr-font-weight-semibold);
}

.ef-segment__rollout--zero {
  background: var(--flagr-color-danger-bg);
  color: var(--flagr-color-danger);
}

.ef-segment__section {
  padding: var(--flagr-space-3) var(--flagr-space-4);
}

.ef-segment__section + .ef-segment__section {
  border-top: 1px solid var(--flagr-color-border);
}

.ef-segment__section-title {
  font-size: var(--flagr-text-xs);
  font-weight: var(--flagr-font-weight-semibold);
  color: var(--flagr-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--flagr-space-2);
}

.ef-segment__muted {
  font-size: var(--flagr-text-sm);
  color: var(--flagr-color-text-muted);
  font-style: italic;
}

/* ── Constraint pills ───────────────────── */

.ef-constraint-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--flagr-space-2);
}

.ef-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px var(--flagr-space-2);
  border-radius: var(--flagr-radius-sm);
  background: var(--flagr-color-bg-muted);
  border: 1px solid var(--flagr-color-border);
  font-family: var(--flagr-font-mono);
  font-size: var(--flagr-text-xs);
  color: var(--flagr-color-text);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ef-pill__op {
  color: var(--flagr-color-primary);
  font-weight: var(--flagr-font-weight-semibold);
}
</style>
