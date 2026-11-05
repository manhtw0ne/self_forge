import {fileURLToPath} from 'node:url'
import {buildVersion} from './scripts/buildVersion.mjs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const version=buildVersion(fileURLToPath(new URL('.',import.meta.url)))
const versionAsset={name:'selfforge-build-version',apply:'build',generateBundle(){this.emitFile({type:'asset',fileName:'assets/app-version.json',source:JSON.stringify({version})})}}

function mobileApiUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.pathname.replace(/\/$/, '').endsWith('/api')
  } catch {
    return false
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (mode === 'mobile' && !mobileApiUrl(env.VITE_API_URL)) {
    throw new Error('Native builds require VITE_API_URL to be an HTTPS endpoint ending in /api. Copy .env.mobile.example to .env.mobile.local first.')
  }
  return {
  server: { proxy: { '/api': 'http://localhost:8080' } },
  define: {__APP_BUILD_ID__: JSON.stringify(version)},
  plugins: [react(),versionAsset],
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'vendor', test: /[\\/]node_modules[\\/]/ }] } } } },
  }
})
