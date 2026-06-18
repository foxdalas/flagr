<template>
  <div class="dist-bar-wrap">
    <div
      class="dist-bar"
      role="img"
      :aria-label="ariaLabel"
    >
      <div
        v-for="(d, i) in distributions"
        :key="d.variantKey + '-' + i"
        class="dist-bar__slice"
        :class="{ 'dist-bar__slice--dim': isDimmed(d), 'dist-bar__slice--on': isAssigned(d) }"
        :style="{ width: d.percent + '%', backgroundColor: variantColor(i) }"
        :title="d.variantKey + ': ' + d.percent + '%'"
      />
    </div>
    <div class="dist-legend">
      <span
        v-for="(d, i) in distributions"
        :key="'lg-' + d.variantKey + '-' + i"
        class="dist-legend__item"
        :class="{ 'dist-legend__item--dim': isDimmed(d), 'dist-legend__item--on': isAssigned(d) }"
      >
        <span
          class="dist-legend__swatch"
          :style="{ backgroundColor: variantColor(i) }"
        />
        <span class="dist-legend__key">{{ d.variantKey }}</span>
        <span class="dist-legend__pct">{{ d.percent }}%</span>
        <span
          v-if="isAssigned(d)"
          class="dist-legend__tag"
        >assigned</span>
      </span>
    </div>
    <div
      v-if="total !== 100"
      class="dist-warning"
    >
      ⚠ Distribution totals {{ total }}% (expected 100%)
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { variantColor } from '@/composables/useVariantColors'

const props = defineProps({
  distributions: { type: Array, default: () => [] },
  // When a trace assigns a variant, pass its key here: the matching slice/legend
  // stays lit and the rest dim, so you can see where the entity landed.
  highlight: { type: String, default: null },
})

const total = computed(() =>
  props.distributions.reduce((sum, d) => sum + (Number(d.percent) || 0), 0)
)

function isAssigned(d) {
  return props.highlight != null && d.variantKey === props.highlight
}

function isDimmed(d) {
  return props.highlight != null && d.variantKey !== props.highlight
}

const ariaLabel = computed(() =>
  'Traffic distribution: ' +
  props.distributions.map(d => `${d.variantKey} ${d.percent}%`).join(', ')
)
</script>

<style scoped>
.dist-bar {
  display: flex;
  height: 22px;
  border-radius: var(--flagr-radius-sm);
  overflow: hidden;
  border: 1px solid var(--flagr-color-border);
  background: var(--flagr-color-bg-subtle);
}

.dist-bar__slice {
  height: 100%;
  min-width: 2px;
  transition: width var(--flagr-transition-base, 200ms ease),
    opacity var(--flagr-transition-base, 200ms ease);
}

.dist-bar__slice--dim {
  opacity: 0.22;
}

.dist-bar__slice--on {
  box-shadow: inset 0 0 0 2px var(--flagr-color-bg-surface);
}

.dist-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--flagr-space-2, 8px) var(--flagr-space-4, 16px);
  margin-top: var(--flagr-space-2, 8px);
  font-size: var(--flagr-text-sm, 13px);
}

.dist-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: opacity var(--flagr-transition-base, 200ms ease);
}

.dist-legend__item--dim {
  opacity: 0.4;
}

.dist-legend__item--on .dist-legend__key {
  font-weight: var(--flagr-font-weight-semibold, 600);
}

.dist-legend__tag {
  font-family: var(--flagr-font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: var(--flagr-radius-full, 999px);
  background: var(--flagr-color-success-bg);
  color: var(--flagr-color-success);
}

.dist-legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.dist-legend__key {
  color: var(--flagr-color-text);
}

/* Percentages are data the user reasons about → mono, tabular figures. */
.dist-legend__pct {
  font-family: var(--flagr-font-mono);
  font-feature-settings: 'tnum' 1;
  color: var(--flagr-color-text-muted);
}

.dist-warning {
  margin-top: var(--flagr-space-2, 8px);
  font-size: var(--flagr-text-sm, 13px);
  color: var(--flagr-amber-600, #d97706);
}
</style>
