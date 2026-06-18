// Single source of truth for variant colours, so a variant reads the same
// colour everywhere it appears — distribution bars, legends, the evaluation
// flow. Colours are assigned by the variant's index within a segment's
// distribution list and cycle if there are more variants than colours.
export const VARIANT_COLORS = [
  'var(--flagr-indigo-400)',
  'var(--flagr-green-500)',
  'var(--flagr-amber-500)',
  'var(--flagr-red-500)',
  'var(--flagr-cyan-500)',
  'var(--flagr-violet-500)',
  'var(--flagr-pink-500)',
  'var(--flagr-teal-500)',
]

export function variantColor(index) {
  return VARIANT_COLORS[((index % VARIANT_COLORS.length) + VARIANT_COLORS.length) % VARIANT_COLORS.length]
}
