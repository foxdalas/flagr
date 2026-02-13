/**
 * Composable for inserting markdown formatting via textarea.setRangeText().
 * Integrates with browser's native undo stack (Ctrl+Z works automatically).
 *
 * @param {import('vue').Ref<HTMLTextAreaElement|null>} textareaRef
 */
export function useMarkdownFormat(textareaRef) {
  function getTextarea() {
    return textareaRef.value
  }

  function wrapSelection(before, after = before) {
    const ta = getTextarea()
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.substring(start, end)
    const replacement = before + (selected || 'text') + after
    ta.setRangeText(replacement, start, end, 'select')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.focus()
  }

  function insertAtLineStart(prefix) {
    const ta = getTextarea()
    if (!ta) return
    const start = ta.selectionStart
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
    ta.setRangeText(prefix, lineStart, lineStart, 'end')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.focus()
  }

  function insertBlock(text) {
    const ta = getTextarea()
    if (!ta) return
    const pos = ta.selectionEnd
    ta.setRangeText('\n' + text + '\n', pos, pos, 'end')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.focus()
  }

  return {
    bold: () => wrapSelection('**'),
    italic: () => wrapSelection('*'),
    strikethrough: () => wrapSelection('~~'),
    inlineCode: () => wrapSelection('`'),
    codeBlock: () => insertBlock('```\n\n```'),
    heading: (level) => insertAtLineStart('#'.repeat(level) + ' '),
    link: () => wrapSelection('[', '](url)'),
    image: () => insertBlock('![alt](url)'),
    bulletList: () => insertAtLineStart('- '),
    numberedList: () => insertAtLineStart('1. '),
    taskList: () => insertAtLineStart('- [ ] '),
    horizontalRule: () => insertBlock('---'),
    table: () => insertBlock('| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell     | Cell     |'),
  }
}
