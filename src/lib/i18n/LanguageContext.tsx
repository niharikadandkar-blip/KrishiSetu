'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/lib/types';

import mrDict from './locales/mr.json';
import hiDict from './locales/hi.json';
import enDict from './locales/en.json';

const dictionaries: Record<Language, any> = {
  mr: mrDict,
  hi: hiDict,
  en: enDict,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('mr'); // Default Marathi

  useEffect(() => {
    // Load from localStorage or Cookie on mount
    const saved = localStorage.getItem('krishisetu_language') as Language;
    if (saved && (saved === 'mr' || saved === 'hi' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('krishisetu_language', lang);
    document.cookie = `krishisetu_language=${lang}; path=/; max-age=31536000`;
  };

  const t = (key: string, defaultText?: string): string => {
    const keys = key.split('.');
    let current: any = dictionaries[language] || dictionaries['mr'];

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English dictionary if key missing in chosen language
        let fallback: any = dictionaries['en'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            fallback = null;
            break;
          }
        }

        if (process.env.NODE_ENV === 'development' && !fallback) {
          console.warn(`[i18n Warning] Missing translation key "${key}" for language "${language}"`);
        }

        return fallback || defaultText || key;
      }
    }

    return typeof current === 'string' ? current : defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
