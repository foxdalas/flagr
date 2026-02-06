const { execSync } = require('child_process');
const AutoImport = require('unplugin-auto-import/webpack')
const Components = require('unplugin-vue-components/webpack')
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers')

try {
  process.env.VUE_APP_VERSION = execSync(
    'git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD',
    { encoding: 'utf-8', shell: true }
  ).trim();
} catch {
  // git not available
}

module.exports = {
  assetsDir: 'static',
  publicPath: process.env.BASE_URL,
  configureWebpack: {
    plugins: [
      AutoImport({ resolvers: [ElementPlusResolver()] }),
      Components({ resolvers: [ElementPlusResolver()] })
    ]
  }
}
