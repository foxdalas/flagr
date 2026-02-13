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
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </div>
      <div
        id="main-content"
        class="router-view-container"
      >
        <router-view />
      </div>
    </div>
  </el-config-provider>
</template>

<script setup>
import en from 'element-plus/es/locale/lang/en'

const version = process.env.VUE_APP_VERSION;
</script>

<style lang="less">
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1,
h2 {
  font-weight: normal;
}

ol {
  margin: 0;
  padding-left: 20px;
}

.width--full {
  width: 100%;
}

#app {
  color: #2c3e50;

  span[size="small"] {
    font-size: 0.85em;
  }

  .navbar {
    background-color: #74e5e0;
    color: #2e4960;
    border: 0;
    padding: 0 20px;

    .logo-container {
      display: flex;
      align-items: center;
      font-weight: bold;

      h3 {
        margin-right: 10px;
        &:hover {
          color: #000;
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

    .nav-links {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 20px;
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
      background-color: #fff9f9;
      padding: 10px;
      text-align: center;
      color: #ed2d2d;
      border: 1px solid #ed2d2d;
      border-radius: 3px;
      width: 100%;
      margin-bottom: 12px;
    }
    &--empty {
      box-sizing: border-box;
      background-color: var(--flagr-color-empty-bg, #fafafa);
      padding: var(--flagr-space-5, 24px) var(--flagr-space-4, 16px);
      text-align: center;
      color: var(--flagr-color-empty-text, #909399);
      border: 1px dashed var(--flagr-color-empty-border, #dcdfe6);
      border-radius: var(--flagr-radius-sm, 4px);
      width: 100%;
      margin-bottom: 12px;
      .empty-title {
        font-size: var(--flagr-text-base, 14px);
        margin-bottom: var(--flagr-space-1, 4px);
      }
      .empty-hint {
        font-size: var(--flagr-text-sm, 13px);
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

  .el-card {
    .el-card__header {
      background-color: #74e5e0;
      color: #2e4960;
      border: 0;

      h2 {
        margin: -0.2em;
        color: inherit;
        font-size: 20px;
      }
    }
    margin-bottom: 1em;
  }

  .jse-main {
    --jse-main-border: 1px solid #e4e7ed;
    --jse-theme-color: #e4e7ed;
    --jse-theme-color-highlight: #d1d5db;
  }

  .el-tag {
    margin: 2.5px;
  }

  .el-icon {
    vertical-align: middle;
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
    background: var(--flagr-color-primary, #74e5e0);
    color: var(--flagr-color-text, #2c3e50);
    z-index: 1000;
  }
}
</style>
