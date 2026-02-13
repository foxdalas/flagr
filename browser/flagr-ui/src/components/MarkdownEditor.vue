<template>
  <div
    v-if="showEditor || markdown"
    class="markdown-editor"
    :class="{ 'markdown-editor--focused': isFocused }"
  >
    <MarkdownToolbar
      v-if="showEditor"
      :format="format"
    />

    <el-row :gutter="0">
      <el-col
        v-if="showEditor"
        :xs="24"
        :md="12"
      >
        <div class="markdown-editor__input-wrap">
          <el-input
            ref="inputRef"
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 24 }"
            placeholder="Write notes using Markdown and KaTeX math…"
            aria-label="Flag notes — markdown editor"
            @input="syncMarkdown"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown="shortcuts.onKeydown"
          />
        </div>
      </el-col>
      <el-col
        :xs="24"
        :md="showEditor ? 12 : 24"
      >
        <div
          class="markdown-editor__preview markdown-body"
          role="document"
          aria-label="Rendered markdown preview"
          aria-live="polite"
          v-html="compiledMarkdown"
        />
      </el-col>
    </el-row>

    <div
      v-if="showEditor"
      class="markdown-editor__status"
    >
      <span>Markdown + KaTeX. Ctrl+B bold, Ctrl+I italic, Ctrl+K link</span>
      <span>{{ input.length }} chars</span>
    </div>
  </div>

  <div
    v-else
    class="markdown-editor__empty"
  >
    No notes yet. Click <strong>edit</strong> to add notes.
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue"
import MarkdownIt from "markdown-it"
import mk from "@vscode/markdown-it-katex"
import xss from "xss"

import "github-markdown-css/github-markdown.css"
import "katex/dist/katex.min.css"

import MarkdownToolbar from "./markdown/MarkdownToolbar.vue"
import { useMarkdownFormat } from "./markdown/useMarkdownFormat"
import { useMarkdownShortcuts } from "./markdown/useMarkdownShortcuts"

const props = defineProps({
  showEditor: Boolean,
  markdown: {
    type: String,
    default: "",
  },
})
const emit = defineEmits(["update:markdown"])

const md = MarkdownIt("commonmark")
md.use(mk)

const xssOptions = {
  whiteList: {
    ...xss.getDefaultWhiteList(),
    // KaTeX HTML rendering
    span: ["class", "style", "aria-hidden"],
    div: ["class", "style"],
    code: ["class"],
    pre: ["class"],
    // KaTeX MathML (accessibility)
    math: ["xmlns"],
    semantics: [],
    annotation: ["encoding"],
    mrow: [],
    mi: [],
    mo: [],
    mn: [],
    msup: [],
    msub: [],
    mfrac: [],
    msqrt: [],
    mover: [],
    munder: [],
  },
}

const input = ref(props.markdown)
const inputRef = ref(null)
const isFocused = ref(false)
const nativeTextarea = ref(null)

watch(
  () => props.markdown,
  (newVal) => {
    input.value = newVal
  }
)

// Get native textarea from el-input when editor is shown
watch(
  () => props.showEditor,
  async (show) => {
    if (show) {
      await nextTick()
      if (inputRef.value) {
        nativeTextarea.value = inputRef.value.textarea
      }
    }
  }
)

onMounted(async () => {
  if (props.showEditor) {
    await nextTick()
    if (inputRef.value) {
      nativeTextarea.value = inputRef.value.textarea
    }
  }
})

const format = useMarkdownFormat(nativeTextarea)
const shortcuts = useMarkdownShortcuts(format)

const compiledMarkdown = computed(() => {
  return xss(md.render(input.value), xssOptions)
})

function syncMarkdown(val) {
  emit("update:markdown", val)
}
</script>

<style lang="less" scoped>
.markdown-editor {
  border: 1px solid var(--flagr-color-border, #e4e7ed);
  border-radius: var(--flagr-radius-md, 6px);
  background: var(--flagr-color-bg-surface, #fff);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.markdown-editor--focused {
  border-color: var(--flagr-color-border-focus);
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2);
}

.markdown-editor__input-wrap {
  height: 100%;
  border-right: 1px solid var(--flagr-color-border, #e4e7ed);

  :deep(.el-textarea__inner) {
    border: none;
    border-radius: 0;
    box-shadow: none;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: var(--flagr-text-base, 14px);
    line-height: 1.6;
    padding: 12px;
    resize: none;
  }
}

.markdown-editor__preview {
  padding: 12px 16px;
  min-height: 120px;
  font-size: var(--flagr-text-base, 14px);
  line-height: 1.7;
  overflow-y: auto;
}

.markdown-editor__status {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;
  font-size: var(--flagr-text-xs, 12px);
  color: var(--flagr-color-text-muted);
  background: var(--flagr-color-bg-subtle);
  border-top: 1px solid var(--flagr-color-border);
}

.markdown-editor__empty {
  padding: 16px;
  color: var(--flagr-color-text-muted);
  font-size: 14px;
}

/* Responsive: stack on small screens */
@media (max-width: 991px) {
  .markdown-editor__input-wrap {
    border-right: none;
    border-bottom: 1px solid var(--flagr-color-border, #e4e7ed);
  }
}
</style>
