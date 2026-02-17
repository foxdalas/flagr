import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useClipboard() {
  const copied = ref(false)
  let resetTimer

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for HTTP deployments
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      if (resetTimer) clearTimeout(resetTimer)
      copied.value = true
      resetTimer = setTimeout(() => { copied.value = false }, 2000)
    } catch {
      ElMessage.error('Failed to copy to clipboard')
    }
  }

  return { copied, copy }
}
