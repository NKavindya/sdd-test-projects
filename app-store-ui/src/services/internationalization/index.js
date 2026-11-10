import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    fr: { translation: fr },
    es: { translation: es },
  },
  lng: localStorage.getItem('store-language') || 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'ja', 'fr', 'es'],
  keySeparator: false,
  interpolation: { escapeValue: false },
});
document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});
export default i18n;
