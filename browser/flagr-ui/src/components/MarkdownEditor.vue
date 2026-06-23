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
            :placeholder="t('notes.placeholder')"
            :aria-label="t('notes.ariaEditor')"
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
          :aria-label="t('notes.ariaPreview')"
          aria-live="polite"
          v-html="compiledMarkdown"
        />
      </el-col>
    </el-row>

    <div
      v-if="showEditor"
      class="markdown-editor__status"
    >
      <span>{{ t('notes.status') }}</span>
      <span>{{ t('notes.chars', { n: input.length }, input.length) }}</span>
    </div>
  </div>

  <i18n-t
    v-else
    keypath="notes.empty"
    tag="div"
    class="markdown-editor__empty"
  >
    <template #edit>
      <strong>{{ t('flag.edit') }}</strong>
    </template>
  </i18n-t>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue"
import { useI18n } from "vue-i18n"
import MarkdownIt from "markdown-it"
import mk from "@vscode/markdown-it-katex"
import taskLists from "markdown-it-task-lists"
import xss from "xss"

// Light-only base (no prefers-color-scheme media query): in Safari with a dark
// OS but the app in light theme, the combined file flipped the notes preview to
// a dark background. Dark mode is handled by the html.dark .markdown-body token
// overrides in tokens.css. Mirrors the Docs.vue fix.
import "github-markdown-css/github-markdown-light.css"
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

const { t } = useI18n({ useScope: "global" })

// Default preset (not "commonmark") so GFM tables and ~~strikethrough~~ render —
// the toolbar exposes both. task-lists adds read-only "- [x]" checkboxes.
const md = MarkdownIt({ breaks: false, linkify: true })
md.use(mk)
md.use(taskLists, { enabled: false, label: false })

const xssOptions = {
  whiteList: {
    ...xss.getDefaultWhiteList(),
    // KaTeX HTML rendering
    span: ["class", "style", "aria-hidden"],
    div: ["class", "style"],
    code: ["class"],
    pre: ["class"],
    // GFM task lists (read-only checkboxes from markdown-it-task-lists)
    input: ["type", "checked", "disabled", "class"],
    ul: ["class"],
    ol: ["class"],
    li: ["class"],
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
  box-shadow: var(--flagr-shadow-focus);
}

.markdown-editor__input-wrap {
  height: 100%;
  border-right: 1px solid var(--flagr-color-border, #e4e7ed);

  :deep(.el-textarea__inner) {
    border: none;
    border-radius: 0;
    box-shadow: none;
    font-family: var(--flagr-font-mono);
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
  /* github-markdown's light file hardcodes light colors, so drive the preview
     from app tokens instead — it then follows the app theme (light AND dark)
     rather than the OS appearance. Same approach as Docs.vue. */
  background: transparent;
  color: var(--flagr-color-text);

  :deep(a) { color: var(--flagr-color-primary); }
  :deep(h1),
  :deep(h2) { border-bottom-color: var(--flagr-color-border); }
  :deep(hr) { background-color: var(--flagr-color-border); }
  :deep(blockquote) {
    color: var(--flagr-color-text-muted);
    border-left-color: var(--flagr-color-border);
  }
  :deep(code),
  :deep(tt) {
    background-color: var(--flagr-color-bg-muted);
    color: var(--flagr-color-text);
  }
  :deep(pre) {
    background-color: var(--flagr-color-bg-subtle);
    color: var(--flagr-color-text);
  }
  :deep(pre code) {
    background-color: transparent;
    color: var(--flagr-color-text);
  }
  :deep(table th),
  :deep(table td) { border-color: var(--flagr-color-border); }
  :deep(table tr) {
    background-color: transparent;
    border-top-color: var(--flagr-color-border);
  }
  :deep(table tr:nth-child(2n)) { background-color: var(--flagr-color-bg-subtle); }
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
  padding: 2px 0;
  color: var(--flagr-color-text-muted);
  font-size: var(--flagr-text-sm, 13px);
}

/* Responsive: stack on small screens */
@media (max-width: 991px) {
  .markdown-editor__input-wrap {
    border-right: none;
    border-bottom: 1px solid var(--flagr-color-border, #e4e7ed);
  }
}
</style>
