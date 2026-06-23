import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ru from './locales/ru'
import es from './locales/es'

export const SUPPORTED_LOCALES = ['en', 'ru', 'es']

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru, es },
  // Russian needs three plural forms (one / few / many); en and es use the
  // default two-form rule.
  pluralRules: {
    ru: (choice) => {
      const n = Math.abs(choice) % 100
      const n1 = n % 10
      if (n > 10 && n < 20) return 2
      if (n1 > 1 && n1 < 5) return 1
      if (n1 === 1) return 0
      return 2
    }
  }
})

export default i18n
