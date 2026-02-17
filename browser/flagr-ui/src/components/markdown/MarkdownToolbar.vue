<template>
  <div
    class="md-toolbar"
    role="toolbar"
    aria-label="Markdown formatting"
  >
    <!-- Inline formatting -->
    <div class="md-toolbar__group">
      <button
        class="md-toolbar-btn"
        type="button"
        title="Bold (Ctrl+B)"
        aria-label="Bold (Ctrl+B)"
        @click="format.bold()"
      >
        <strong>B</strong>
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Italic (Ctrl+I)"
        aria-label="Italic (Ctrl+I)"
        @click="format.italic()"
      >
        <em>I</em>
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Strikethrough (Ctrl+Shift+S)"
        aria-label="Strikethrough (Ctrl+Shift+S)"
        @click="format.strikethrough()"
      >
        <s>S</s>
      </button>
    </div>

    <div class="md-toolbar__sep" />

    <!-- Headings -->
    <div class="md-toolbar__group">
      <button
        class="md-toolbar-btn"
        type="button"
        title="Heading 1 (Ctrl+1)"
        aria-label="Heading 1 (Ctrl+1)"
        @click="format.heading(1)"
      >
        H1
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Heading 2 (Ctrl+2)"
        aria-label="Heading 2 (Ctrl+2)"
        @click="format.heading(2)"
      >
        H2
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Heading 3 (Ctrl+3)"
        aria-label="Heading 3 (Ctrl+3)"
        @click="format.heading(3)"
      >
        H3
      </button>
    </div>

    <div class="md-toolbar__sep" />

    <!-- Code -->
    <div class="md-toolbar__group">
      <button
        class="md-toolbar-btn"
        type="button"
        title="Inline code (Ctrl+E)"
        aria-label="Inline code (Ctrl+E)"
        @click="format.inlineCode()"
      >
        &lt;&gt;
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Code block (Ctrl+Shift+E)"
        aria-label="Code block (Ctrl+Shift+E)"
        @click="format.codeBlock()"
      >
        { }
      </button>
    </div>

    <div class="md-toolbar__sep" />

    <!-- Lists -->
    <div class="md-toolbar__group">
      <button
        class="md-toolbar-btn"
        type="button"
        title="Bullet list"
        aria-label="Bullet list"
        @click="format.bulletList()"
      >
        &#8211;
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Task list"
        aria-label="Task list"
        @click="format.taskList()"
      >
        &#9745;
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Numbered list"
        aria-label="Numbered list"
        @click="format.numberedList()"
      >
        1.
      </button>
    </div>

    <div class="md-toolbar__sep" />

    <!-- Block elements -->
    <div class="md-toolbar__group">
      <button
        class="md-toolbar-btn"
        type="button"
        title="Horizontal rule"
        aria-label="Horizontal rule"
        @click="format.horizontalRule()"
      >
        &#8212;
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Link (Ctrl+K)"
        aria-label="Link (Ctrl+K)"
        @click="format.link()"
      >
        <el-icon :size="14">
          <Link />
        </el-icon>
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Image"
        aria-label="Image"
        @click="format.image()"
      >
        <el-icon :size="14">
          <Picture />
        </el-icon>
      </button>
      <button
        class="md-toolbar-btn"
        type="button"
        title="Table"
        aria-label="Table"
        @click="format.table()"
      >
        &#8862;
      </button>
    </div>

    <div class="md-toolbar__sep" />

    <!-- Help -->
    <div class="md-toolbar__group">
      <MarkdownHelp />
    </div>
  </div>
</template>

<script setup>
import { Link, Picture } from '@element-plus/icons-vue'
import MarkdownHelp from './MarkdownHelp.vue'

defineProps({
  format: {
    type: Object,
    required: true,
  },
})
</script>

<style lang="less" scoped>
.md-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: var(--flagr-color-bg-subtle, #f6f8fa);
  border-bottom: 1px solid var(--flagr-color-border, #e4e7ed);
  flex-wrap: wrap;
  min-height: 36px;
}

.md-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.md-toolbar__sep {
  width: 1px;
  height: 18px;
  background: var(--flagr-color-border, #dcdfe6);
  margin: 0 4px;
}
</style>

<style lang="less">
/* Unscoped — shared button style for toolbar + help trigger */
.md-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--flagr-color-text-secondary);
  font-size: 13px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  cursor: pointer;
  line-height: 1;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: var(--flagr-color-bg-muted);
    border-color: var(--flagr-color-border);
  }

  &:active {
    background: var(--flagr-color-border);
  }
}

.md-toolbar-btn--help {
  font-weight: 700;
  color: var(--flagr-color-text-muted);
}
</style>
