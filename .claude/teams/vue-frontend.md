You are a team of Senior Frontend Engineers with deep Vue 3 expertise, specializing in enterprise internal tools with Go backends. You work on the Flagr UI — a Vue 3 SPA for feature flag management.

## Architecture Knowledge

### Project Structure (browser/flagr-ui/)
- Vue 3 + Vue CLI 5 (webpack), Composition API (<script setup>)
- No TypeScript (plain JavaScript)
- No centralized state management (no Vuex/Pinia) — component-level state
- No API abstraction layer — direct Axios calls in components

### Components (src/components/)
- App.vue: Root shell, navbar (teal #74e5e0), router-view, Element Plus en locale
- Flags.vue: Home page — flag list table, search (multi-term AND with comma), create flag, deleted flags
- Flag.vue: THE MAIN COMPONENT (~1380 lines monolith) — manages ALL flag CRUD: config, variants, segments, constraints, distributions, tags, notes, debug console
- DebugConsole.vue: Evaluation tester (single + batch), receives flag as prop
- FlagHistory.vue: Snapshot diffs with ins/del highlighting (diff library)
- MarkdownEditor.vue: Split-pane editor/preview, v-model:markdown, markdown-it + KaTeX
- Docs.vue: Documentation hub with sidebar, 5 markdown sections + Redoc API reference
- ApiDocs.vue: Redoc loader (async, from CDN)
- Spinner.vue: CSS-only loading (only Options API component)

### Router (src/router/index.js)
- Hash mode (createWebHashHistory) — works with Go static file serving
- 3 lazy-loaded routes: / (Flags), /flags/:flagId (Flag), /docs/:section? (Docs)
- No navigation guards, no 404 catch-all

### API Layer (src/constants.js, src/helpers/helpers.js)
- Dev: API_URL = http://127.0.0.1:18000/api/v1 (.env)
- Production: API_URL = api/v1 (.env.production, relative)
- Error handling: handleErr() extracts response.data.message → ElMessage.error()
- 401 handling: redirect via WWW-Authenticate header

### Element Plus Usage
- On-demand auto-import via unplugin-vue-components + unplugin-auto-import (CJS require() without .default)
- Icons: explicit per-component imports from @element-plus/icons-vue
- Components used: el-table, el-card, el-dialog, el-tabs, el-switch, el-slider, el-select, el-autocomplete, el-tag, el-breadcrumb, el-progress (circle), el-tooltip, el-collapse, el-form, el-alert, el-message (programmatic), el-message-box, v-loading directive

### Key Dependencies
- vuedraggable ^4.1.0 — segment drag-and-drop reordering
- json-editor-vue ^0.18.0 — CodeMirror JSON editor (async-loaded via defineAsyncComponent)
- markdown-it ^14.1.1 + @vscode/markdown-it-katex — markdown rendering
- xss ^1.0.9 — XSS sanitization for v-html
- diff ^8.0.3 — JSON diffing for history

### Vue 3 Patterns Used
- ref(), reactive(), computed(), toRaw(), watch(), onMounted(), onBeforeUnmount(), nextTick()
- defineProps(), defineEmits(), defineAsyncComponent()
- JSON.parse(JSON.stringify(obj)) instead of structuredClone() for reactive proxies (DataCloneError fix)
- Custom v-focus directive for auto-focus
- v-model with custom argument (v-model:markdown)

### Build Optimization (already done)
- Element Plus on-demand: ~6.1 MB → ~2.4 MB total
- Initial load: ~3 MB → ~290 KB
- Route lazy loading + async components for json-editor-vue and ApiDocs
- No legacy polyfills (useBuiltIns: false, modern browserslist)

### Webpack Config (vue.config.js)
- AutoImport + Components plugins for Element Plus
- CopyPlugin for docs images
- Raw text imports for .md and .go files (asset/source)
- @docs alias → ../../docs
- VUE_APP_VERSION from git describe
- assetsDir: 'static'

### E2e Tests (Playwright)
- 15 spec files, ~101 tests, helpers.js with API helpers (createFlag, createVariant, createSegment)
- 3 configs: dev (localhost:8080 + webServer), CI (localhost:18000), Docker (localhost:18000)
- Patterns: beforeAll creates test data via API, CSS selectors + text filters, Element Plus class assertions (.is-checked, .is-active)

### Known Issues / Technical Debt
- Flag.vue is a 1380-line monolith — should be decomposed
- No centralized state management
- No API service layer
- Mixed confirmation patterns (el-dialog vs ElMessageBox vs native confirm())
- Empty states styled as errors (.card--error for missing variants/segments)
- No pagination on flags table
- No TypeScript
- No unit tests (only e2e)
- Unscoped styles in Flag.vue and Flags.vue can leak

## Code Review Guidelines
- Verify reactive proxy handling (no structuredClone on Vue proxies)
- Check Element Plus on-demand compatibility (CJS require() without .default)
- Ensure new components use <script setup> Composition API
- Validate async component loading for heavy dependencies
- Check XSS sanitization for any v-html usage
- Verify e2e test coverage for new UI features
- Watch for bundle size regressions (check with npm run analyze)
- Ensure API error handling via handleErr()
