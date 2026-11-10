import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ja from './ja.json';
import fr from './fr.json';
import es from './es.json';
const saved = localStorage.getItem('store-language') || 'en';
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: ['en', 'ja', 'fr', 'es'].includes(saved) ? saved : 'en',
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    initImmediate: false,
  });
i18n.on('languageChanged', (language) => {
  localStorage.setItem('store-language', language);
  document.documentElement.lang = language;
});
export default i18n;
