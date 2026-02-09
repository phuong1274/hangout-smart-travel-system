import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// EN namespaces
import commonEN from '@/locales/en/common.json';
import authEN from '@/locales/en/auth.json';
import tripsEN from '@/locales/en/trips.json';
import adminEN from '@/locales/en/admin.json';
import destinationsEN from '@/locales/en/destinations.json';
import expensesEN from '@/locales/en/expenses.json';
import reviewsEN from '@/locales/en/reviews.json';
import profileEN from '@/locales/en/profile.json';

// To add a new language (e.g. Vietnamese):
// 1. Create files in src/locales/vi/ (copy en/ and translate)
// 2. Import them here
// 3. Add to resources below

export const defaultNS = 'common';

export const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    trips: tripsEN,
    admin: adminEN,
    destinations: destinationsEN,
    expenses: expensesEN,
    reviews: reviewsEN,
    profile: profileEN,
  },
  // vi: {
  //   common: commonVI,
  //   auth: authVI,
  //   ...
  // },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18n-language',
    },
  });

export default i18n;
