import { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';

type Language = 'en' | 'kh';

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
} | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ✅ Initialize from localStorage or fallback to i18n or 'en'
  const [language, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('appLanguage') as Language | null;
    return stored || (i18n.language as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLang(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('appLanguage', lang); // ✅ Save to localStorage
  };

  useEffect(() => {
    // ✅ Make sure i18n stays in sync with stored language
    const stored = localStorage.getItem('appLanguage') as Language | null;
    if (stored && i18n.language !== stored) {
      i18n.changeLanguage(stored);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageContext must be used inside LanguageProvider');
  return context;
};
