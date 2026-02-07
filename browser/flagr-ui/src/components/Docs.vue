<template>
  <div class="docs-layout">
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"
      integrity="sha384-41TLk51mEPibuqZ3qC5guTOeo30Zt7UUaWLUn0/VdpGRO6b3SXA6AaKxj1mYzgAT"
      crossorigin="anonymous"
    >
    <nav class="docs-sidebar">
      <ul>
        <li
          v-for="item in sidebarItems"
          :key="item.key"
          :class="{ active: currentSection === item.key, separator: item.separator }"
        >
          <div
            v-if="item.separator"
            class="separator-line"
          />
          <router-link
            v-else
            :to="{ name: 'docs', params: { section: item.key } }"
          >
            {{ item.label }}
          </router-link>
        </li>
      </ul>
      <div
        v-if="version"
        class="docs-version"
      >
        {{ version }}
      </div>
    </nav>
    <main class="docs-content">
      <ApiDocs v-if="currentSection === 'api'" />
      <div
        v-else
        class="markdown-body"
        @click="handleContentClick"
        v-html="renderedHtml"
      />
    </main>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import xss from 'xss'

import overviewMd from '@docs/flagr_overview.md'
import homeMd from '@docs/home.md'
import useCasesMd from '@docs/flagr_use_cases.md'
import configMd from '@docs/flagr_env.md'
import debuggingMd from '@docs/flagr_debugging.md'
import envGoSource from '@docs/../pkg/config/env.go'

const ApiDocs = defineAsyncComponent(() => import('./ApiDocs.vue'))

const route = useRoute()
const router = useRouter()
const version = process.env.VUE_APP_VERSION

const md = MarkdownIt('commonmark')

const sections = {
  overview: overviewMd,
  'get-started': homeMd,
  'use-cases': useCasesMd,
  config: configMd,
  debugging: debuggingMd
}

const sidebarItems = [
  { key: 'get-started', label: 'Get Started' },
  { key: 'overview', label: 'Overview' },
  { key: 'use-cases', label: 'Use Cases' },
  { key: 'config', label: 'Server Config' },
  { key: 'debugging', label: 'Debug Console' },
  { key: 'sep', separator: true },
  { key: 'api', label: 'API Reference' }
]

const currentSection = computed(() => route.params.section || 'get-started')

const xssOptions = {
  whiteList: {
    ...xss.getDefaultWhiteList(),
    div: ['class'],
    code: ['class'],
    pre: ['class'],
    span: ['class']
  }
}

function preprocessMarkdown(content) {
  const base = process.env.BASE_URL || '/'

  // Replace !> warnings with styled divs
  content = content.replace(
    /^!>\s*(.+)$/gm,
    '<div class="docs-warning">$1</div>'
  )

  // Replace :include :type=code with actual env.go source
  content = content.replace(
    /\[.*?\]\(.*?':include\s+:type=code'\)/g,
    '```go\n' + envGoSource + '\n```'
  )

  // Normalize image paths (both /images/ and images/)
  content = content.replace(
    /!\[([^\]]*)\]\(\/?images\//g,
    `![$1](${base}docs/images/`
  )

  return content
}

const renderedHtml = computed(() => {
  const raw = sections[currentSection.value]
  if (!raw) return ''
  const processed = preprocessMarkdown(raw)
  return xss(md.render(processed), xssOptions)
})

const linkMap = {
  flagr_overview: 'overview',
  flagr_use_cases: 'use-cases',
  flagr_env: 'config',
  flagr_debugging: 'debugging',
  home: 'get-started'
}

function handleContentClick(e) {
  const link = e.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href')
  if (href && !href.startsWith('http') && !href.startsWith('#')) {
    e.preventDefault()
    const key = href.replace('.md', '')
    if (linkMap[key]) {
      router.push({ name: 'docs', params: { section: linkMap[key] } })
    }
  }
}
</script>

<style lang="less" scoped>
.docs-layout {
  display: flex;
  min-height: calc(100vh - 60px);
}

.docs-sidebar {
  width: 220px;
  min-width: 220px;
  background: #f6f8fa;
  border-right: 1px solid #e4e7ed;
  padding: 16px 0;
  display: flex;
  flex-direction: column;

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
  }

  li {
    &.separator {
      padding: 0 16px;
      margin: 8px 0;
    }

    a {
      display: block;
      padding: 8px 20px;
      color: #2c3e50;
      text-decoration: none;
      font-size: 14px;
      border-left: 3px solid transparent;

      &:hover {
        background: #ebeef5;
      }
    }

    &.active a {
      font-weight: 600;
      color: #2e4960;
      border-left-color: #74e5e0;
      background: #ebeef5;
    }
  }

  .separator-line {
    border-top: 1px solid #e4e7ed;
  }

  .docs-version {
    padding: 12px 20px;
    font-size: 12px;
    color: #909399;
  }
}

.docs-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  min-width: 0;

  .markdown-body {
    max-width: 900px;

    :deep(img) {
      max-width: 100%;
      height: auto;
    }

    :deep(.docs-warning) {
      background: #fff7e6;
      border-left: 4px solid #e6a23c;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
      color: #6b5900;
    }
  }
}
</style>
