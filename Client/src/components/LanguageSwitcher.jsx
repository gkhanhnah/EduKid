import { useTranslation } from 'react-i18next'

const LANGUAGES = ['en', 'vi']

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()

  function changeLanguage(nextLanguage) {
    i18n.changeLanguage(nextLanguage)
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-border bg-white p-1 ${className}`}
      aria-label={t('language.label')}
    >
      {LANGUAGES.map((language) => {
        const active = i18n.resolvedLanguage === language || i18n.language === language
        return (
          <button
            key={language}
            type="button"
            onClick={() => changeLanguage(language)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? 'bg-primary text-white' : 'text-foreground hover:bg-accent'
            }`}
            aria-pressed={active}
          >
            {t(`language.${language}`)}
          </button>
        )
      })}
    </div>
  )
}
