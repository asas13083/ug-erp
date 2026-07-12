import { createContext, useContext, useEffect, useState } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'ug_erp_language';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'ar');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // t(نص عربي) بيرجع النص الإنجليزي المقابل لو اللغة إنجليزي، وإلا بيرجع العربي زي ما هو
  function t(arabicText) {
    if (lang === 'ar') return arabicText;
    const entry = translations[arabicText];
    return entry?.en || arabicText; // لو مفيش ترجمة لسه، يرجع العربي بدل ما يبوّظ الشاشة
  }

  function toggleLanguage() {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }

  return <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage لازم يُستخدم جوه LanguageProvider');
  return ctx;
}
