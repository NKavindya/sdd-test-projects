import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    ja: { translation: ja },
  },
  lng: localStorage.getItem("publisher.locale") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
  localStorage.setItem("publisher.locale", language);
});
export default i18n;
