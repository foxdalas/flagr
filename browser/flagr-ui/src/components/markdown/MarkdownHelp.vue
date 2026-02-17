<template>
  <el-popover
    placement="bottom-end"
    :width="360"
    trigger="click"
  >
    <template #reference>
      <button
        class="md-toolbar-btn md-toolbar-btn--help"
        type="button"
        aria-label="Markdown help"
        title="Markdown help"
      >
        ?
      </button>
    </template>
    <div class="md-help">
      <h4 class="md-help__title">
        Markdown Cheat Sheet
      </h4>
      <table class="md-help__table">
        <tbody>
          <tr>
            <td class="md-help__syntax">
              **bold**
            </td>
            <td><strong>bold</strong></td>
            <td class="md-help__shortcut">
              Ctrl+B
            </td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              *italic*
            </td>
            <td><em>italic</em></td>
            <td class="md-help__shortcut">
              Ctrl+I
            </td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              ~~strike~~
            </td>
            <td><s>strike</s></td>
            <td class="md-help__shortcut">
              Ctrl+Shift+S
            </td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              `code`
            </td>
            <td><code>code</code></td>
            <td class="md-help__shortcut">
              Ctrl+E
            </td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              [text](url)
            </td>
            <td>link</td>
            <td class="md-help__shortcut">
              Ctrl+K
            </td>
          </tr>
        </tbody>
      </table>

      <h4 class="md-help__title">
        Blocks
      </h4>
      <table class="md-help__table">
        <tbody>
          <tr>
            <td class="md-help__syntax">
              # H1 &nbsp; ## H2 &nbsp; ### H3
            </td>
            <td class="md-help__shortcut">
              Ctrl+1/2/3
            </td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              - item &nbsp; 1. item &nbsp; - [ ] task
            </td>
            <td />
          </tr>
          <tr>
            <td class="md-help__syntax">
              ```lang ... ```
            </td>
            <td class="md-help__shortcut">
              Ctrl+Shift+E
            </td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              ![alt](image-url)
            </td>
            <td />
          </tr>
          <tr>
            <td class="md-help__syntax">
              | col | col |
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      <h4 class="md-help__title">
        Math (KaTeX)
      </h4>
      <table class="md-help__table">
        <tbody>
          <tr>
            <td class="md-help__syntax">
              $E=mc^2$
            </td>
            <td>inline math</td>
          </tr>
          <tr>
            <td class="md-help__syntax">
              $$\sum x_i$$
            </td>
            <td>block math</td>
          </tr>
        </tbody>
      </table>
    </div>
  </el-popover>
</template>

<script setup>
</script>

<style lang="less" scoped>
.md-help {
  font-size: 13px;
  line-height: 1.5;
}

.md-help__title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--flagr-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:not(:first-child) {
    margin-top: 12px;
  }
}

.md-help__table {
  width: 100%;
  border-collapse: collapse;

  td {
    padding: 3px 6px;
    vertical-align: middle;
  }
}

.md-help__syntax {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--flagr-color-text);
  background: var(--flagr-color-bg-subtle);
  padding: 2px 6px;
  border-radius: 3px;
}

.md-help__shortcut {
  text-align: right;
  font-size: 11px;
  color: var(--flagr-color-text-muted);
  white-space: nowrap;
}
</style>
