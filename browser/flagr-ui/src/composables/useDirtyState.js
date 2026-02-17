import { ref, watch } from 'vue'

/**
 * Tracks whether a reactive source has changed since the last snapshot.
 * WARNING-ONLY — no auto-save.
 *
 * @param {import('vue').Ref} source - The reactive ref to track
 * @param {{ deep?: boolean }} options
 * @returns {{ isDirty: import('vue').Ref<boolean>, takeSnapshot: () => void }}
 */
export function useDirtyState (source, { deep = true } = {}) {
  const snapshot = ref(null)
  const isDirty = ref(false)

  function takeSnapshot () {
    snapshot.value = JSON.stringify(source.value)
    isDirty.value = false
  }

  watch(source, () => {
    if (snapshot.value === null) return
    isDirty.value = JSON.stringify(source.value) !== snapshot.value
  }, { deep })

  return { isDirty, takeSnapshot }
}
