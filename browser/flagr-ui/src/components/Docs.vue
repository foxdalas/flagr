<template>
  <div class="docs-layout">
    <nav class="docs-sidebar">
      <ul>
        <li
          v-for="item in sidebarItems"
          :key="item.key"
          :class="{ active: currentSection === item.key, group: item.group }"
        >
          <span
            v-if="item.group"
            class="group-label"
          >{{ item.label }}</span>
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
    <aside
      v-if="currentSection !== 'api' && toc.length > 1"
      class="docs-toc"
    >
      <div class="docs-toc__title">
        {{ t('docsNav.onThisPage') }}
      </div>
      <ul>
        <li
          v-for="h in toc"
          :key="h.slug"
          :class="['lvl-' + h.level, { active: activeHeading === h.slug }]"
        >
          <a
            :href="'#' + h.slug"
            @click.prevent="goToHeading(h.slug)"
          >{{ h.text }}</a>
        </li>
      </ul>
    </aside>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import xss from 'xss'

// Syntax highlighting: core + only the languages the docs actually use
// (keeps the lazy docs chunk small). Colors come from --flagr-syntax-* tokens
// below, so highlighting follows the app theme — not a bundled hljs theme.
import hljs from 'highlight.js/lib/core'
import jsonLang from 'highlight.js/lib/languages/json'
import bashLang from 'highlight.js/lib/languages/bash'
import goLang from 'highlight.js/lib/languages/go'
import jsLang from 'highlight.js/lib/languages/javascript'
import yamlLang from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('json', jsonLang)
hljs.registerLanguage('bash', bashLang)
hljs.registerLanguage('go', goLang)
hljs.registerLanguage('javascript', jsLang)
hljs.registerLanguage('yaml', yamlLang)
// Fence info strings used in the docs that alias to a registered language.
const LANG_ALIASES = { sh: 'bash', shell: 'bash', js: 'javascript', yml: 'yaml' }

// Light-only base (no prefers-color-scheme media query); colors are overridden
// with app tokens below so the docs follow the app theme, not the OS appearance.
import 'github-markdown-css/github-markdown-light.css'

import { useLocale } from '@/composables/useLocale'

import overviewMd from '@docs/flagr_overview.md?raw'
import homeMd from '@docs/home.md?raw'
import useCasesMd from '@docs/flagr_use_cases.md?raw'
import evaluationMd from '@docs/flagr_evaluation.md?raw'
import configMd from '@docs/flagr_env.md?raw'
import debuggingMd from '@docs/flagr_debugging.md?raw'

import operatorsMd from '@docs/flagr_operators.md?raw'
import evalApiMd from '@docs/flagr_eval_api.md?raw'
import ofrepMd from '@docs/flagr_ofrep.md?raw'
import gitopsMd from '@docs/flagr_json_flag_spec.md?raw'
import notificationsMd from '@docs/flagr_notifications.md?raw'
import analyticsMd from '@docs/flagr_datar.md?raw'
import monitoringMd from '@docs/flagr_monitoring.md?raw'
import managementApiMd from '@docs/flagr_management_api.md?raw'
import deploymentMd from '@docs/flagr_deployment.md?raw'

// User Guide (web UI) — English for now; RU/ES fall back to English until translated.
import uiBasicsMd from '@docs/flagr_ui_basics.md?raw'
import uiFlagsMd from '@docs/flagr_ui_flags.md?raw'
import uiEditorMd from '@docs/flagr_ui_editor.md?raw'
import uiVariantsMd from '@docs/flagr_ui_variants.md?raw'
import uiSegmentsMd from '@docs/flagr_ui_segments.md?raw'
import uiDistributionMd from '@docs/flagr_ui_distribution.md?raw'
import uiTestingMd from '@docs/flagr_ui_testing.md?raw'

import overviewRu from '@docs/i18n/ru/flagr_overview.md?raw'
import homeRu from '@docs/i18n/ru/home.md?raw'
import useCasesRu from '@docs/i18n/ru/flagr_use_cases.md?raw'
import evaluationRu from '@docs/i18n/ru/flagr_evaluation.md?raw'
import configRu from '@docs/i18n/ru/flagr_env.md?raw'
import debuggingRu from '@docs/i18n/ru/flagr_debugging.md?raw'
import operatorsRu from '@docs/i18n/ru/flagr_operators.md?raw'
import evalApiRu from '@docs/i18n/ru/flagr_eval_api.md?raw'
import ofrepRu from '@docs/i18n/ru/flagr_ofrep.md?raw'
import gitopsRu from '@docs/i18n/ru/flagr_json_flag_spec.md?raw'
import notificationsRu from '@docs/i18n/ru/flagr_notifications.md?raw'
import analyticsRu from '@docs/i18n/ru/flagr_datar.md?raw'
import monitoringRu from '@docs/i18n/ru/flagr_monitoring.md?raw'
import managementApiRu from '@docs/i18n/ru/flagr_management_api.md?raw'
import deploymentRu from '@docs/i18n/ru/flagr_deployment.md?raw'
import uiBasicsRu from '@docs/i18n/ru/flagr_ui_basics.md?raw'
import uiFlagsRu from '@docs/i18n/ru/flagr_ui_flags.md?raw'
import uiEditorRu from '@docs/i18n/ru/flagr_ui_editor.md?raw'
import uiVariantsRu from '@docs/i18n/ru/flagr_ui_variants.md?raw'
import uiSegmentsRu from '@docs/i18n/ru/flagr_ui_segments.md?raw'
import uiDistributionRu from '@docs/i18n/ru/flagr_ui_distribution.md?raw'
import uiTestingRu from '@docs/i18n/ru/flagr_ui_testing.md?raw'

import overviewEs from '@docs/i18n/es/flagr_overview.md?raw'
import homeEs from '@docs/i18n/es/home.md?raw'
import useCasesEs from '@docs/i18n/es/flagr_use_cases.md?raw'
import evaluationEs from '@docs/i18n/es/flagr_evaluation.md?raw'
import configEs from '@docs/i18n/es/flagr_env.md?raw'
import debuggingEs from '@docs/i18n/es/flagr_debugging.md?raw'
import operatorsEs from '@docs/i18n/es/flagr_operators.md?raw'
import evalApiEs from '@docs/i18n/es/flagr_eval_api.md?raw'
import ofrepEs from '@docs/i18n/es/flagr_ofrep.md?raw'
import gitopsEs from '@docs/i18n/es/flagr_json_flag_spec.md?raw'
import notificationsEs from '@docs/i18n/es/flagr_notifications.md?raw'
import analyticsEs from '@docs/i18n/es/flagr_datar.md?raw'
import monitoringEs from '@docs/i18n/es/flagr_monitoring.md?raw'
import managementApiEs from '@docs/i18n/es/flagr_management_api.md?raw'
import deploymentEs from '@docs/i18n/es/flagr_deployment.md?raw'
import uiBasicsEs from '@docs/i18n/es/flagr_ui_basics.md?raw'
import uiFlagsEs from '@docs/i18n/es/flagr_ui_flags.md?raw'
import uiEditorEs from '@docs/i18n/es/flagr_ui_editor.md?raw'
import uiVariantsEs from '@docs/i18n/es/flagr_ui_variants.md?raw'
import uiSegmentsEs from '@docs/i18n/es/flagr_ui_segments.md?raw'
import uiDistributionEs from '@docs/i18n/es/flagr_ui_distribution.md?raw'
import uiTestingEs from '@docs/i18n/es/flagr_ui_testing.md?raw'

import envGoSource from '@docs/../pkg/config/env.go?raw'

const ApiDocs = defineAsyncComponent(() => import('./ApiDocs.vue'))

const route = useRoute()
const router = useRouter()
const version = import.meta.env.VITE_VERSION
const { t } = useI18n({ useScope: 'global' })
const { locale } = useLocale()

// Default preset (not 'commonmark') so GFM tables render — the reference docs
// (operators, eval API, env config, etc.) rely heavily on tables. html:true keeps
// the injected `!>` admonition <div>s rendering (output is sanitized by xss()).
const md = MarkdownIt({
  html: true,
  // Per-fence syntax highlighting. Returns hljs's escaped token markup; an empty
  // string lets markdown-it escape + wrap the code itself (unknown langs, e.g. promql).
  highlight(code, lang) {
    const l = LANG_ALIASES[lang] || lang
    if (l && hljs.getLanguage(l)) {
      try {
        return hljs.highlight(code, { language: l, ignoreIllegals: true }).value
      } catch { /* fall through to plain escaping */ }
    }
    return ''
  }
})

// Open external links in a new tab.
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href') || ''
  if (/^https?:/.test(href)) {
    tokens[idx].attrSet('target', '_blank')
    tokens[idx].attrSet('rel', 'noopener noreferrer')
  }
  return self.renderToken(tokens, idx, options)
}

// Wrap tables in a horizontally-scrollable container: a table too wide to fit
// (e.g. the env-config reference on a phone) then scrolls inside the wrapper
// instead of pushing the whole page wider (broken responsive layout).
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>'
md.renderer.rules.table_close = () => '</table></div>'

// Wrap fenced code blocks so we can attach a copy button (handled by delegation).
const defaultFence = md.renderer.rules.fence.bind(md.renderer.rules)
md.renderer.rules.fence = (tokens, idx, options, env, self) =>
  `<div class="code-block">${defaultFence(tokens, idx, options, env, self)}` +
  `<button class="docs-copy" type="button" aria-label="Copy code">${t('docsNav.copy')}</button></div>`

// `!>` admonitions as a real block rule so their inner Markdown (bold, inline
// code, links) is parsed — the old approach wrapped them in a raw <div>, which
// markdown-it treats as an HTML block and leaves the contents unparsed.
md.block.ruler.before('paragraph', 'admonition', (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  if (pos + 2 > max) return false
  if (state.src.charCodeAt(pos) !== 0x21 /* ! */ || state.src.charCodeAt(pos + 1) !== 0x3e /* > */) return false
  if (silent) return true

  // Collect this line and any continuation lines until a blank line / next admonition.
  let content = state.src.slice(pos + 2, max).replace(/^\s+/, '')
  let nextLine = startLine + 1
  for (; nextLine < endLine; nextLine++) {
    const lpos = state.bMarks[nextLine] + state.tShift[nextLine]
    const lmax = state.eMarks[nextLine]
    if (lpos >= lmax) break
    if (state.src.charCodeAt(lpos) === 0x21 && state.src.charCodeAt(lpos + 1) === 0x3e) break
    content += '\n' + state.src.slice(lpos, lmax)
  }

  let token = state.push('admonition_open', 'div', 1)
  token.attrSet('class', 'docs-warning')
  token.block = true
  token.map = [startLine, nextLine]
  token = state.push('inline', '', 0)
  token.content = content
  token.map = [startLine, nextLine]
  token.children = []
  state.push('admonition_close', 'div', -1).block = true

  state.line = nextLine
  return true
})

// Localized doc bodies; English is the fallback when a locale is missing a page.
const enExtra = {
  operators: operatorsMd,
  'eval-api': evalApiMd,
  ofrep: ofrepMd,
  gitops: gitopsMd,
  'management-api': managementApiMd,
  deployment: deploymentMd,
  notifications: notificationsMd,
  analytics: analyticsMd,
  monitoring: monitoringMd
}
const ruExtra = {
  operators: operatorsRu,
  'eval-api': evalApiRu,
  ofrep: ofrepRu,
  gitops: gitopsRu,
  'management-api': managementApiRu,
  deployment: deploymentRu,
  notifications: notificationsRu,
  analytics: analyticsRu,
  monitoring: monitoringRu
}
const esExtra = {
  operators: operatorsEs,
  'eval-api': evalApiEs,
  ofrep: ofrepEs,
  gitops: gitopsEs,
  'management-api': managementApiEs,
  deployment: deploymentEs,
  notifications: notificationsEs,
  analytics: analyticsEs,
  monitoring: monitoringEs
}
const uiEn = {
  'ui-basics': uiBasicsMd,
  'ui-flags': uiFlagsMd,
  'ui-editor': uiEditorMd,
  'ui-variants': uiVariantsMd,
  'ui-segments': uiSegmentsMd,
  'ui-distribution': uiDistributionMd,
  'ui-testing': uiTestingMd
}
const uiRu = {
  'ui-basics': uiBasicsRu,
  'ui-flags': uiFlagsRu,
  'ui-editor': uiEditorRu,
  'ui-variants': uiVariantsRu,
  'ui-segments': uiSegmentsRu,
  'ui-distribution': uiDistributionRu,
  'ui-testing': uiTestingRu
}
const uiEs = {
  'ui-basics': uiBasicsEs,
  'ui-flags': uiFlagsEs,
  'ui-editor': uiEditorEs,
  'ui-variants': uiVariantsEs,
  'ui-segments': uiSegmentsEs,
  'ui-distribution': uiDistributionEs,
  'ui-testing': uiTestingEs
}

const docsByLocale = {
  en: { overview: overviewMd, 'get-started': homeMd, 'use-cases': useCasesMd, evaluation: evaluationMd, config: configMd, debugging: debuggingMd, ...enExtra, ...uiEn },
  ru: { overview: overviewRu, 'get-started': homeRu, 'use-cases': useCasesRu, evaluation: evaluationRu, config: configRu, debugging: debuggingRu, ...ruExtra, ...uiRu },
  es: { overview: overviewEs, 'get-started': homeEs, 'use-cases': useCasesEs, evaluation: evaluationEs, config: configEs, debugging: debuggingEs, ...esExtra, ...uiEs }
}

const sidebarItems = computed(() => [
  { key: 'g-intro', group: true, label: t('docsNav.groupIntro') },
  { key: 'get-started', label: t('docsNav.getStarted') },
  { key: 'overview', label: t('docsNav.overview') },
  { key: 'evaluation', label: t('docsNav.evaluation') },
  { key: 'g-ui', group: true, label: t('docsNav.groupUi') },
  { key: 'ui-basics', label: t('docsNav.uiBasics') },
  { key: 'ui-flags', label: t('docsNav.uiFlags') },
  { key: 'ui-editor', label: t('docsNav.uiEditor') },
  { key: 'ui-variants', label: t('docsNav.uiVariants') },
  { key: 'ui-segments', label: t('docsNav.uiSegments') },
  { key: 'ui-distribution', label: t('docsNav.uiDistribution') },
  { key: 'ui-testing', label: t('docsNav.uiTesting') },
  { key: 'g-build', group: true, label: t('docsNav.groupBuild') },
  { key: 'use-cases', label: t('docsNav.useCases') },
  { key: 'operators', label: t('docsNav.operators') },
  { key: 'eval-api', label: t('docsNav.evalApi') },
  { key: 'ofrep', label: t('docsNav.ofrep') },
  { key: 'management-api', label: t('docsNav.managementApi') },
  { key: 'gitops', label: t('docsNav.gitops') },
  { key: 'g-operate', group: true, label: t('docsNav.groupOperate') },
  { key: 'deployment', label: t('docsNav.deployment') },
  { key: 'notifications', label: t('docsNav.notifications') },
  { key: 'analytics', label: t('docsNav.analytics') },
  { key: 'monitoring', label: t('docsNav.monitoring') },
  { key: 'config', label: t('docsNav.config') },
  { key: 'g-ref', group: true, label: t('docsNav.groupReference') },
  { key: 'api', label: t('docsNav.apiReference') }
])

const currentSection = computed(() => route.params.section || 'get-started')

const xssOptions = {
  whiteList: {
    ...xss.getDefaultWhiteList(),
    a: ['href', 'title', 'target', 'rel'],
    div: ['class'],
    code: ['class'],
    pre: ['class'],
    span: ['class'],
    button: ['class', 'type', 'aria-label'],
    h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id']
  },
  // xss's default safeAttrValue blanks scheme-less hrefs (e.g. "flagr_operators"),
  // which are our internal doc links. Preserve those bare relative links (no ":" so
  // javascript:/data: etc. still fall through to xss's safe handling); let in-page
  // "#anchor" and everything else use the default.
  safeAttrValue(tag, name, value, cssFilter) {
    if (tag === 'a' && name === 'href' && /^[\w./-]+(\.md)?(#[\w-]+)?$/.test(value) && !value.includes(':')) {
      return value
    }
    return xss.safeAttrValue(tag, name, value, cssFilter)
  }
}

// Slugify a heading into a URL-safe id (keeps Latin + Cyrillic letters).
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function preprocessMarkdown(content) {
  const base = import.meta.env.BASE_URL || '/'

  // `!>` admonitions are handled by a markdown-it block rule (see above).

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

// Parse once: assign ids to h2/h3 headings and collect an on-page table of contents.
function buildDoc(raw) {
  const env = {}
  const tokens = md.parse(preprocessMarkdown(raw), env)
  const toc = []
  const seen = {}
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.type === 'heading_open' && (tok.tag === 'h2' || tok.tag === 'h3')) {
      const text = (tokens[i + 1].content || '').replace(/[`*_~]/g, '').trim()
      let slug = slugify(text) || 'section'
      if (seen[slug] != null) { seen[slug] += 1; slug = `${slug}-${seen[slug]}` } else { seen[slug] = 0 }
      tok.attrSet('id', slug)
      toc.push({ level: Number(tok.tag[1]), text, slug })
    }
  }
  return { html: xss(md.renderer.render(tokens, md.options, env), xssOptions), toc }
}

const rendered = computed(() => {
  const byLocale = docsByLocale[locale.value] || docsByLocale.en
  const raw = byLocale[currentSection.value] || docsByLocale.en[currentSection.value]
  if (!raw) return { html: '', toc: [] }
  return buildDoc(raw)
})
const renderedHtml = computed(() => rendered.value.html)
const toc = computed(() => rendered.value.toc)
const activeHeading = ref('')

// Scroll-spy: highlight the TOC entry whose heading is nearest the top.
function onScroll() {
  const hs = toc.value
  if (!hs.length) return
  let current = hs[0].slug
  for (const h of hs) {
    const el = document.getElementById(h.slug)
    if (el && el.getBoundingClientRect().top <= 120) current = h.slug
    else break
  }
  activeHeading.value = current
}

function goToHeading(slug) {
  const el = document.getElementById(slug)
  if (el) {
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    activeHeading.value = slug
  }
}

// Reset scroll + active heading when switching pages or language.
watch([currentSection, locale], () => {
  activeHeading.value = toc.value[0]?.slug || ''
  nextTick(() => window.scrollTo({ top: 0, behavior: 'auto' }))
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  nextTick(onScroll)
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const linkMap = {
  flagr_overview: 'overview',
  flagr_use_cases: 'use-cases',
  flagr_evaluation: 'evaluation',
  flagr_env: 'config',
  flagr_debugging: 'debugging',
  home: 'get-started',
  flagr_operators: 'operators',
  flagr_eval_api: 'eval-api',
  flagr_ofrep: 'ofrep',
  flagr_json_flag_spec: 'gitops',
  flagr_notifications: 'notifications',
  flagr_datar: 'analytics',
  flagr_monitoring: 'monitoring',
  flagr_management_api: 'management-api',
  flagr_deployment: 'deployment',
  flagr_ui_basics: 'ui-basics',
  flagr_ui_flags: 'ui-flags',
  flagr_ui_editor: 'ui-editor',
  flagr_ui_variants: 'ui-variants',
  flagr_ui_segments: 'ui-segments',
  flagr_ui_distribution: 'ui-distribution',
  flagr_ui_testing: 'ui-testing'
}

function handleContentClick(e) {
  // Copy button on code blocks.
  const copyBtn = e.target.closest('.docs-copy')
  if (copyBtn) {
    const code = copyBtn.closest('.code-block')?.querySelector('code, pre')
    if (code) {
      navigator.clipboard?.writeText(code.innerText).then(() => {
        copyBtn.textContent = t('docsNav.copied')
        copyBtn.classList.add('is-copied')
        setTimeout(() => { copyBtn.textContent = t('docsNav.copy'); copyBtn.classList.remove('is-copied') }, 1500)
      })
    }
    return
  }
  const link = e.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href')
  // In-page heading anchors are handled by the browser; let them through.
  if (!href || href.startsWith('http') || href.startsWith('#')) return
  e.preventDefault()
  const key = href.replace('.md', '').split('#')[0]
  if (linkMap[key]) {
    router.push({ name: 'docs', params: { section: linkMap[key] } })
  }
}
</script>

<style lang="less" scoped>
@navbar-h: var(--flagr-navbar-height, 67px);

.docs-layout {
  display: flex;
  align-items: flex-start;
  min-height: calc(100vh - @navbar-h);
}

.docs-sidebar {
  width: 230px;
  min-width: 230px;
  position: sticky;
  top: @navbar-h;
  max-height: calc(100vh - @navbar-h);
  overflow-y: auto;
  background: var(--flagr-color-bg-subtle);
  border-right: 1px solid var(--flagr-color-border);
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
    &.group {
      margin-top: 18px;
      &:first-child { margin-top: 0; }
    }

    .group-label {
      display: block;
      padding: 4px 20px;
      font-size: 11px;
      font-weight: var(--flagr-font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--flagr-color-text-muted);
    }

    a {
      display: block;
      padding: 6px 20px;
      color: var(--flagr-color-text-secondary);
      text-decoration: none;
      font-size: 14px;
      border-left: 2px solid transparent;
      transition: color var(--flagr-transition-fast, 150ms ease),
        background-color var(--flagr-transition-fast, 150ms ease);

      &:hover {
        background: var(--flagr-color-bg-muted);
        color: var(--flagr-color-text);
      }
    }

    &.active a {
      font-weight: 600;
      color: var(--flagr-color-primary);
      border-left-color: var(--flagr-color-primary);
      background: var(--flagr-color-primary-light);
    }
  }

  .docs-version {
    padding: 12px 20px;
    font-size: 12px;
    color: var(--flagr-color-text-muted);
  }
}

.docs-content {
  flex: 1;
  padding: 24px 40px;
  min-width: 0;

  .markdown-body {
    max-width: 1200px;
    color: var(--flagr-color-text);
    background: transparent;

    /* Reading column: keep running text at a comfortable ~820px measure, but let
       tables, code, and images break out to the full content width so they stop
       wrapping when the screen has room (the column itself goes up to 1200px). */
    :deep(p),
    :deep(ul),
    :deep(ol),
    :deep(dl),
    :deep(blockquote),
    :deep(.docs-warning) {
      max-width: 820px;
    }

    /* Drive all colors from app tokens so docs follow the app theme (not the OS). */
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
      border: 1px solid var(--flagr-color-border);
    }
    :deep(pre code) {
      background-color: transparent;
      color: var(--flagr-color-text);
    }

    /* Syntax highlighting — all colors from theme-aware --flagr-syntax-* tokens
       (defined in tokens.css for light + html.dark), so code follows the app
       theme rather than a bundled hljs stylesheet. */
    :deep(.hljs-comment),
    :deep(.hljs-quote) { color: var(--flagr-syntax-comment); font-style: italic; }
    :deep(.hljs-keyword),
    :deep(.hljs-built_in),
    :deep(.hljs-selector-tag) { color: var(--flagr-syntax-keyword); }
    :deep(.hljs-string),
    :deep(.hljs-regexp),
    :deep(.hljs-meta .hljs-string) { color: var(--flagr-syntax-string); }
    :deep(.hljs-number),
    :deep(.hljs-bullet) { color: var(--flagr-syntax-number); }
    :deep(.hljs-literal) { color: var(--flagr-syntax-literal); }
    :deep(.hljs-attr),
    :deep(.hljs-attribute),
    :deep(.hljs-property),
    :deep(.hljs-name) { color: var(--flagr-syntax-attr); }
    :deep(.hljs-title),
    :deep(.hljs-title.function_),
    :deep(.hljs-section) { color: var(--flagr-syntax-function); }
    :deep(.hljs-type),
    :deep(.hljs-class .hljs-title) { color: var(--flagr-syntax-type); }
    :deep(.hljs-variable),
    :deep(.hljs-template-variable),
    :deep(.hljs-params) { color: var(--flagr-syntax-variable); }
    :deep(.hljs-meta) { color: var(--flagr-syntax-meta); }
    :deep(.hljs-emphasis) { font-style: italic; }
    :deep(.hljs-strong) { font-weight: 600; }
    /* Tables: clean, card-like styling consistent with the app — a single
       rounded outer border, a tinted header, and horizontal row separators
       only (no heavy grid, no zebra). Overrides github-markdown-css, which
       renders full cell borders, zebra striping, square corners, and
       display:block (which left tables looking like a bare spreadsheet). */
    /* The wrapper owns the rounded border + horizontal scroll; the table itself
       is borderless with row separators only. Putting border/radius/clipping on
       a plain <div> (not the <table>) is robust across Safari versions — older
       WebKit ignores overflow:hidden + border-radius on a table element, which
       left the square header corners poking out of the rounded border. A
       too-wide table scrolls inside the wrapper, never the page. */
    :deep(.table-wrap) {
      margin: 16px 0;
      max-width: 100%;
      overflow-x: auto;
      border: 1px solid var(--flagr-color-border);
      border-radius: var(--flagr-radius-md, 10px);
    }
    :deep(table) {
      display: table;
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: var(--flagr-text-base, 14px);
      line-height: var(--flagr-line-height-normal, 1.5);
    }
    :deep(table th),
    :deep(table td) {
      padding: 10px 14px;
      text-align: left;
      vertical-align: top;
      border: none;
      border-bottom: 1px solid var(--flagr-color-border);
      overflow-wrap: break-word;
    }
    :deep(table thead th) {
      background-color: var(--flagr-color-bg-subtle);
      color: var(--flagr-color-text);
      font-weight: var(--flagr-font-weight-semibold, 600);
    }
    :deep(table tbody tr) { background-color: transparent; }
    :deep(table tbody tr:last-child td) { border-bottom: none; }
    /* Long inline-code tokens (e.g. FLAGR_* env names) must be breakable so a
       cell's min-width can't force the table wider than the column. */
    :deep(table code) { overflow-wrap: anywhere; }

    :deep(img) {
      max-width: 100%;
      height: auto;
    }

    :deep(h2),
    :deep(h3),
    :deep(h4) {
      scroll-margin-top: calc(@navbar-h + 16px);
    }

    :deep(.docs-warning) {
      background: var(--flagr-color-warning-bg);
      border-left: 4px solid var(--flagr-color-warning);
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
      color: var(--flagr-color-text);
    }

    :deep(.code-block) {
      position: relative;
    }

    :deep(.docs-copy) {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0.55;
      padding: 2px 9px;
      font-family: var(--flagr-font-sans);
      font-size: 12px;
      line-height: 1.5;
      color: var(--flagr-color-text-secondary);
      background: var(--flagr-color-bg-surface);
      border: 1px solid var(--flagr-color-border);
      border-radius: var(--flagr-radius-sm, 6px);
      cursor: pointer;
      transition: opacity var(--flagr-transition-fast, 150ms ease),
        color var(--flagr-transition-fast, 150ms ease),
        border-color var(--flagr-transition-fast, 150ms ease);
    }

    :deep(.code-block:hover .docs-copy) {
      opacity: 1;
    }

    :deep(.docs-copy:hover) {
      color: var(--flagr-color-text);
      border-color: var(--flagr-color-border-strong);
    }

    :deep(.docs-copy.is-copied) {
      opacity: 1;
      color: var(--flagr-color-success);
      border-color: var(--flagr-color-success);
    }

    :deep(.docs-copy:focus-visible) {
      opacity: 1;
      box-shadow: var(--flagr-shadow-focus);
      outline: none;
    }
  }
}

/* On-page table of contents (right rail) */
.docs-toc {
  width: 220px;
  min-width: 220px;
  position: sticky;
  top: @navbar-h;
  max-height: calc(100vh - @navbar-h);
  overflow-y: auto;
  padding: 26px 16px 24px;

  &__title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: var(--flagr-font-weight-semibold, 600);
    color: var(--flagr-color-text-muted);
    margin-bottom: 8px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    a {
      display: block;
      padding: 3px 0 3px 12px;
      font-size: 13px;
      line-height: 1.4;
      color: var(--flagr-color-text-secondary);
      text-decoration: none;
      border-left: 2px solid var(--flagr-color-border);
      transition: color var(--flagr-transition-fast, 150ms ease),
        border-color var(--flagr-transition-fast, 150ms ease);

      &:hover {
        color: var(--flagr-color-text);
      }
    }

    &.lvl-3 a {
      padding-left: 24px;
      font-size: 12px;
    }

    &.active a {
      color: var(--flagr-color-primary);
      border-left-color: var(--flagr-color-primary);
    }
  }
}

/* Hide the TOC when there isn't room for three columns */
@media (max-width: 1100px) {
  .docs-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .docs-layout {
    flex-direction: column;
    align-items: stretch;
  }
  .docs-sidebar {
    position: static;
    width: 100%;
    min-width: unset;
    max-height: none;
    overflow: visible;
    border-right: none;
    border-bottom: 1px solid var(--flagr-color-border);
    padding: 8px 0;

    ul {
      display: flex;
      overflow-x: auto;
      gap: 4px;
      padding: 0 8px;
    }

    li.group {
      display: none;
    }

    li a {
      white-space: nowrap;
      padding: 6px 12px;
      border-left: none;
      border-radius: var(--flagr-radius-sm);
    }

    li.active a {
      border-left-color: transparent;
    }
  }
  .docs-content {
    padding: 16px;
  }
}
</style>
