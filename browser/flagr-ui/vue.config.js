const { execSync } = require('child_process');
const path = require('path')
const AutoImport = require('unplugin-auto-import/webpack')
const Components = require('unplugin-vue-components/webpack')
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers')
const CopyPlugin = require('copy-webpack-plugin')

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
  chainWebpack: (config) => {
    config.module.rule('raw-text')
      .test(/\.(md|go)$/)
      .set('type', 'asset/source')

    config.resolve.alias.set('@docs', path.resolve(__dirname, '../../docs'))
  },
  configureWebpack: {
    plugins: [
      AutoImport({ resolvers: [ElementPlusResolver()] }),
      Components({ resolvers: [ElementPlusResolver()] }),
      new CopyPlugin({
        patterns: [{
          from: path.resolve(__dirname, '../../docs/images'),
          to: 'docs/images'
        }]
      })
    ]
  }
}
