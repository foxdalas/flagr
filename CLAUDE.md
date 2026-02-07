# Flagr

Feature flag and A/B testing service. Go backend (:18000) + Vue 3 frontend (browser/flagr-ui/).

## Quick Reference

- **Backend**: `pkg/` (hand-written), `swagger_gen/` (generated — don't edit except `configure_flagr.go`)
- **Frontend**: `browser/flagr-ui/src/` — Vue 3 + Element Plus, Composition API
- **Tests**: `make test` (Go), `npx playwright test` (e2e, 101 specs in `browser/flagr-ui/e2e/`)
- **Build**: `make build` (CGO_ENABLED=0), `npm run build` (frontend)
- **Lint**: `make verify_lint` (golangci-lint v2.8.0), `npm run lint` (eslint)
- **Swagger**: `make swagger` to regenerate from `swagger/*.yaml`

## Key Constraints

- No CGO (CGO_ENABLED=0, pure-Go SQLite via glebarez/sqlite)
- No structuredClone() on Vue reactive proxies — use JSON.parse(JSON.stringify())
- Element Plus on-demand imports use CJS require() without .default
- New Vue components must use `<script setup>` Composition API

## Development Teams

Specialized agent prompts in `.claude/teams/` for use with Task tool:

| Team | File | Use For |
|------|------|---------|
| Go Backend | `.claude/teams/go-backend.md` | Backend features, eval engine, data pipelines, Go code review |
| Vue Frontend | `.claude/teams/vue-frontend.md` | UI features, Vue components, webpack, e2e tests |
| Product Design | `.claude/teams/product-design.md` | Design system, visual design, layout, color, typography |
| UI/UX | `.claude/teams/ui-ux.md` | UX audits, workflow analysis, accessibility, interaction design |

### Usage

Read the team prompt file, then pass it as context to a Task agent:

```
Task(subagent_type="general-purpose", model="opus", prompt="<contents of team file>\n\n<specific task>")
```

**Examples**:
- Backend review: "Review this change for performance regressions in the eval hot path"
- Frontend feature: "Implement pagination for the flags table"
- Design: "Design a flag overview dashboard"
- UX review: "Audit the segment constraint editing workflow"
