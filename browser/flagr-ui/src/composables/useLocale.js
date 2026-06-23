import { ref } from 'vue'
import i18n, { SUPPORTED_LOCALES } from '@/i18n'
import enEP from 'element-plus/es/locale/lang/en'
import ruEP from 'element-plus/es/locale/lang/ru'
import esEP from 'element-plus/es/locale/lang/es'

const STORAGE_KEY = 'flagr-locale'
const epLocales = { en: enEP, ru: ruEP, es: esEP }

// Native names shown in the language switcher.
export const LOCALE_NAMES = { en: 'English', ru: 'Русский', es: 'Español' }

const locale = ref('en')
// Element Plus locale (date pickers, pagination, empty text…) kept in sync.
const elementLocale = ref(enEP)

function apply(l) {
  locale.value = l
  i18n.global.locale.value = l
  elementLocale.value = epLocales[l] || enEP
  document.documentElement.setAttribute('lang', l)
}

function setLocale(l) {
  if (!SUPPORTED_LOCALES.includes(l)) return
  apply(l)
  localStorage.setItem(STORAGE_KEY, l)
}

function init() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (SUPPORTED_LOCALES.includes(stored)) {
    apply(stored)
    return
  }
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase()
  apply(SUPPORTED_LOCALES.includes(browser) ? browser : 'en')
}

export function useLocale() {
  return { locale, elementLocale, setLocale, init, locales: SUPPORTED_LOCALES }
}
