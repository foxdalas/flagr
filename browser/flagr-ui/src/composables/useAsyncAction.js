import { ref } from 'vue'
import helpers from '@/helpers/helpers'

/**
 * Wraps an async operation with loading state.
 * @returns {{ loading: import('vue').Ref<boolean>, execute: (promiseFn: Function, opts?: { onSuccess?: Function, onError?: Function }) => Promise<*> }}
 */
export function useAsyncAction () {
  const loading = ref(false)

  async function execute (promiseFn, { onSuccess, onError } = {}) {
    if (loading.value) return
    loading.value = true
    try {
      const result = await promiseFn()
      if (onSuccess) onSuccess(result)
      return result
    } catch (err) {
      if (onError) onError(err)
      else helpers.handleErr(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { loading, execute }
}
