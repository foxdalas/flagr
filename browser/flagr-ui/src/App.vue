<template>
  <el-config-provider :locale="en">
    <div id="app">
      <a
        href="#main-content"
        class="sr-only"
      >Skip to content</a>
      <div class="navbar">
        <el-row>
          <el-col
            :span="20"
            :offset="2"
          >
            <el-row>
              <el-col :span="6">
                <router-link :to="{ name: 'home' }">
                  <div class="logo-container">
                    <h3 class="logo">
                      Flagr
                    </h3>
                    <div>
                      <span class="version">{{ version }}</span>
                    </div>
                  </div>
                </router-link>
              </el-col>
              <el-col
                :span="4"
                :offset="14"
                class="nav-links"
              >
                <router-link :to="{ name: 'docs', params: { section: 'api' } }">
                  <h3>API</h3>
                </router-link>
                <router-link :to="{ name: 'docs' }">
                  <h3>Docs</h3>
                </router-link>
                <button
                  class="theme-toggle"
                  data-testid="theme-toggle"
                  aria-label="Toggle dark mode"
                  @click="toggle"
                >
                  <el-icon :size="18">
                    <Moon v-if="theme === 'light'" />
                    <Sunny v-else />
                  </el-icon>
                </button>
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
      <div
        id="main-content"
        class="router-view-container"
      >
        <router-view v-slot="{ Component }">
          <transition
            name="fade"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </el-config-provider>
</template>

<script setup>
import en from 'element-plus/es/locale/lang/en'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useTheme } from './composables/useTheme'

const version = process.env.VUE_APP_VERSION;
const { theme, toggle } = useTheme()
</script>

<style lang="less">
/* ── Global Reset & Typography (Step 1) ─── */
body {
  margin: 0;
  padding: 0;
  font-family: var(--flagr-font-sans);
  font-feature-settings: 'tnum' 1;
  letter-spacing: -0.011em;
  line-height: var(--flagr-line-height-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--flagr-color-bg-page);
  color: var(--flagr-color-text);
  transition: background-color var(--flagr-transition-base), color var(--flagr-transition-base);
}

h1,
h2 {
  font-weight: var(--flagr-font-weight-semibold);
}

ol {
  margin: 0;
  padding-left: 20px;
}

.width--full {
  width: 100%;
}

/* ── Route transitions (Step 3) ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

/* ── Reduced Motion (Step 3) ─── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

#app {
  color: var(--flagr-color-text);

  span[size="small"] {
    font-size: 0.85em;
  }

  /* ── Navbar (Step 7) ─── */
  .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--flagr-color-navbar-bg);
    color: var(--flagr-color-navbar-text);
    border: 0;
    border-bottom: 1px solid var(--flagr-color-border);
    box-shadow: var(--flagr-shadow-sm);
    padding: 0 20px;
    transition: background-color var(--flagr-transition-base), border-color var(--flagr-transition-base);

    .logo-container {
      display: flex;
      align-items: center;
      font-weight: var(--flagr-font-weight-bold);

      h3 {
        margin-right: 10px;
        &:hover {
          color: var(--flagr-color-primary);
        }
      }

      span {
        font-size: 12px;
      }
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    /* Active route pill indicator (Step 7) — scoped to nav links only */
    .nav-links .router-link-active h3 {
      background: var(--flagr-color-primary-light);
      color: var(--flagr-color-primary);
      padding: 2px 12px;
      border-radius: var(--flagr-radius-full);
    }

    .nav-links {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 20px;
    }

    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--flagr-color-border);
      border-radius: var(--flagr-radius-sm);
      background: transparent;
      color: var(--flagr-color-text-secondary);
      cursor: pointer;
      transition: background-color var(--flagr-transition-fast), border-color var(--flagr-transition-fast), color var(--flagr-transition-fast);

      &:hover {
        background-color: var(--flagr-color-bg-muted);
        border-color: var(--flagr-color-border-strong);
        color: var(--flagr-color-text);
      }

      &:focus-visible {
        box-shadow: var(--flagr-shadow-focus);
        outline: none;
      }
    }

    .el-col {
      text-align: right;

      &:first-child {
        text-align: left;
      }
    }
  }

  .flex-row {
    display: flex;
    align-items: center;
    justify-content: center;
    &-right {
      margin-left: auto;
    }
    &.equal-width {
      > * {
        flex: 1;
      }
    }
    &.align-items-top {
      align-items: flex-start;
    }
  }

  .container {
    margin: 0 auto;
    margin-top: 20px;
  }

  .logo-container img {
    height: 60px;
  }

  .card {
    &--error {
      box-sizing: border-box;
      background-color: var(--flagr-color-danger-bg);
      padding: 10px;
      text-align: center;
      color: var(--flagr-color-danger);
      border: 1px solid var(--flagr-color-danger);
      border-radius: var(--flagr-radius-sm);
      width: 100%;
      margin-bottom: 12px;
    }
    &--empty {
      box-sizing: border-box;
      background-color: var(--flagr-color-empty-bg);
      padding: var(--flagr-space-5) var(--flagr-space-4);
      text-align: center;
      color: var(--flagr-color-empty-text);
      border: 1px dashed var(--flagr-color-empty-border);
      border-radius: var(--flagr-radius-sm);
      width: 100%;
      margin-bottom: 12px;
      .empty-icon {
        font-size: 32px;
        margin-bottom: var(--flagr-space-2);
        color: var(--flagr-color-empty-text);
      }
      .empty-title {
        font-size: var(--flagr-text-base);
        font-weight: var(--flagr-font-weight-medium);
        color: var(--flagr-color-text-secondary);
        margin-bottom: var(--flagr-space-1);
      }
      .empty-hint {
        font-size: var(--flagr-text-sm);
        color: var(--flagr-color-text-muted);
      }
    }
  }

  .el-breadcrumb {
    margin-bottom: 20px;
  }

  .el-input {
    margin-bottom: 2px;
  }

  .segment-rollout-percent input {
    text-align: right;
  }

  /* ── Card Modernization (Step 2) ─── */
  .el-card {
    background-color: var(--flagr-color-bg-surface);
    border-radius: var(--flagr-radius-md);
    box-shadow: var(--flagr-shadow-sm);
    overflow: hidden;
    transition: box-shadow var(--flagr-transition-base);

    .el-card__header {
      position: relative;
      background-color: var(--flagr-color-card-header-bg);
      color: var(--flagr-color-card-header-text);
      border-bottom: 1px solid var(--flagr-color-border);
      padding: var(--flagr-space-4) var(--flagr-space-5);

      /* Top accent bar — fades from left for subtle elegance */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 40%;
        height: 2px;
        background: linear-gradient(90deg, var(--flagr-color-card-header-border) 0%, transparent 100%);
      }

      h2 {
        margin: -0.2em;
        color: inherit;
        font-size: var(--flagr-text-lg);
        font-weight: var(--flagr-font-weight-semibold);
      }
    }
    margin-bottom: var(--flagr-space-4);
  }

  .el-tag {
    margin: 2.5px;
  }

  .el-icon {
    vertical-align: middle;
  }

  /* ── Input Focus Enhancement (Step 5) ─── */
  .el-input__wrapper:focus-within {
    box-shadow: 0 0 0 1px var(--flagr-color-border-focus), var(--flagr-shadow-focus) !important;
  }

  .el-input__wrapper {
    transition: box-shadow var(--flagr-transition-fast), border-color var(--flagr-transition-fast);
  }

  /* ── Focus-visible for all interactive elements (Step 5) ─── */
  .el-button:focus-visible,
  .el-switch:focus-visible,
  .el-select:focus-visible,
  .el-checkbox:focus-visible {
    box-shadow: var(--flagr-shadow-focus);
    outline: none;
  }

  /* ── Danger plain button hover fill (Step 5) ─── */
  .el-button--danger.is-plain:hover {
    background-color: var(--flagr-color-danger);
    color: #fff;
    border-color: var(--flagr-color-danger);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  &:focus {
    position: static;
    width: auto;
    height: auto;
    padding: 0.5em;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
    background: var(--flagr-color-primary);
    color: var(--flagr-color-text-on-primary);
    z-index: 1000;
  }
}

/* ── Responsive basics (Step 9d) ─── */
@media (max-width: 768px) {
  #app .navbar {
    padding: 0 10px;
  }
  #app .container {
    margin-top: 12px;
  }
}
</style>
