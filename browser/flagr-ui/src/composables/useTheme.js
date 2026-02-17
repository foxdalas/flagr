import { ref } from 'vue'

const STORAGE_KEY = 'flagr-theme'
const theme = ref('light')

function applyTheme(t) {
  theme.value = t
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.documentElement.setAttribute('data-theme', t)
}

function toggle() {
  const next = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(next)
  localStorage.setItem(STORAGE_KEY, next)
}

function init() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light')
    }
  })
}

export function useTheme() {
  return { theme, toggle, init }
}
