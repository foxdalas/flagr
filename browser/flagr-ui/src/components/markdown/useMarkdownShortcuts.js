/**
 * Keyboard shortcuts for markdown formatting.
 * @param {ReturnType<typeof import('./useMarkdownFormat').useMarkdownFormat>} format
 */
export function useMarkdownShortcuts(format) {
  function onKeydown(e) {
    const mod = e.metaKey || e.ctrlKey
    if (!mod) return

    if (e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      format.strikethrough()
      return
    }

    if (e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault()
      format.codeBlock()
      return
    }

    const map = {
      b: format.bold,
      i: format.italic,
      k: format.link,
      e: format.inlineCode,
      1: () => format.heading(1),
      2: () => format.heading(2),
      3: () => format.heading(3),
    }

    const handler = map[e.key.toLowerCase()]
    if (handler) {
      e.preventDefault()
      handler()
    }
  }

  return { onKeydown }
}
