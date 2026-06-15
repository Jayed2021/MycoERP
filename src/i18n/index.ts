import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultLanguage } from './languages';
import en from './locales/en.json';
import bn from './locales/bn.json';

const STORAGE_KEY = 'mycoerp-lang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    lng: localStorage.getItem(STORAGE_KEY) || defaultLanguage,
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false,
    },
  });

export function changeLanguage(code: string) {
  i18n.changeLanguage(code);
  localStorage.setItem(STORAGE_KEY, code);
}

export default i18n;
