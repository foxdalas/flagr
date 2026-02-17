<template>
  <div class="eval-flow">
    <!-- Entry node -->
    <div class="ef-node ef-node--entry">
      <div class="ef-node__icon">
        ↓
      </div>
      <div class="ef-node__content">
        <div class="ef-node__title">
          Evaluation Request
        </div>
        <div class="ef-node__subtitle">
          entityID + entityContext
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
          Flag {{ flag.enabled ? 'Enabled' : 'Disabled' }}
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
              No Segments
            </div>
            <div class="ef-node__subtitle">
              Empty result — no segments configured
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
            >no match</span>
          </div>

          <div class="ef-segment">
            <div class="ef-segment__header">
              <span class="ef-segment__rank">[{{ idx + 1 }}]</span>
              <span class="ef-segment__name">{{ segment.description || 'Unnamed segment' }}</span>
              <span
                class="ef-segment__rollout"
                :class="{ 'ef-segment__rollout--zero': segment.rolloutPercent === 0 }"
              >
                Rollout {{ segment.rolloutPercent }}%
              </span>
            </div>

            <!-- Constraints -->
            <div class="ef-segment__section">
              <div class="ef-segment__section-title">
                Constraints (AND)
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
                No constraints — all entities match
              </div>
            </div>

            <!-- Distribution -->
            <div class="ef-segment__section">
              <div class="ef-segment__section-title">
                Distribution
              </div>
              <template v-if="segmentDistributions(segment).length">
                <div class="ef-dist-bar">
                  <div
                    v-for="(d, dIdx) in segmentDistributions(segment)"
                    :key="d.variantKey"
                    class="ef-dist-bar__slice"
                    :style="{
                      width: d.percent + '%',
                      backgroundColor: variantColor(dIdx),
                    }"
                    :title="d.variantKey + ': ' + d.percent + '%'"
                  />
                </div>
                <div class="ef-dist-legend">
                  <span
                    v-for="(d, dIdx) in segmentDistributions(segment)"
                    :key="'legend-' + d.variantKey"
                    class="ef-dist-legend__item"
                  >
                    <span
                      class="ef-dist-legend__swatch"
                      :style="{ backgroundColor: variantColor(dIdx) }"
                    />
                    {{ d.variantKey }} {{ d.percent }}%
                  </span>
                </div>
                <div
                  v-if="distributionTotal(segment) !== 100"
                  class="ef-segment__warning"
                >
                  ⚠ Distribution totals {{ distributionTotal(segment) }}% (expected 100%)
                </div>
              </template>
              <div
                v-else
                class="ef-segment__muted"
              >
                No distribution configured
              </div>
            </div>
          </div>
        </template>

        <!-- Terminal: no match -->
        <div class="ef-connector">
          <span class="ef-connector__label">no match</span>
        </div>
        <div class="ef-node ef-node--terminal">
          <div class="ef-node__content">
            <div class="ef-node__title">
              No Match
            </div>
            <div class="ef-node__subtitle">
              Empty result
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
            Flag Disabled
          </div>
          <div class="ef-node__subtitle">
            Empty result — flag is not enabled
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import operators from "@/operators.json";

defineProps({
  flag: { type: Object, required: true },
});

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

function distributionTotal(segment) {
  if (!segment.distributions) return 0;
  return segment.distributions.reduce((sum, d) => sum + d.percent, 0);
}

const VARIANT_COLORS = [
  "var(--flagr-indigo-400)",
  "var(--flagr-green-500)",
  "var(--flagr-amber-500)",
  "var(--flagr-red-500)",
  "var(--flagr-cyan-500)",
  "var(--flagr-violet-500)",
  "var(--flagr-pink-500)",
  "var(--flagr-teal-500)",
];

function variantColor(index) {
  return VARIANT_COLORS[index % VARIANT_COLORS.length];
}
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

.ef-segment__warning {
  font-size: var(--flagr-text-xs);
  color: var(--flagr-color-warning);
  margin-top: var(--flagr-space-1);
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

/* ── Distribution bar ───────────────────── */

.ef-dist-bar {
  display: flex;
  height: 20px;
  border-radius: var(--flagr-radius-sm);
  overflow: hidden;
  border: 1px solid var(--flagr-color-border);
}

.ef-dist-bar__slice {
  height: 100%;
  min-width: 2px;
  transition: width var(--flagr-transition-base);
}

.ef-dist-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--flagr-space-2) var(--flagr-space-4);
  margin-top: var(--flagr-space-2);
}

.ef-dist-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--flagr-text-xs);
  color: var(--flagr-color-text-secondary);
}

.ef-dist-legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
