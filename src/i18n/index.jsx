import React, { createContext, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { settingsApi } from "../services/api";

const translations = { en, fr };

const I18nContext = createContext({
  t: (k) => k,
  language: "fr",
  setLanguage: () => {},
});

export function I18nProvider({ children, initial = "fr" }) {
  const [language, setLanguageState] = useState(initial);

  useEffect(() => {
    // Optionally load user settings from server and sync language
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          // load from localStorage fallback if available
          const saved = localStorage.getItem("esl_user_settings");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed?.language) setLanguageState(parsed.language);
            } catch (err) {
              // ignore parse errors
            }
          }
          console.debug(
            "[I18n] initialized language from localStorage fallback",
            { language: language },
          );
          return;
        }

        const res = await settingsApi.get();
        if (res?.data?.settings?.language) {
          console.debug("[I18n] initialized language from server settings", {
            language: res.data.settings.language,
          });
          setLanguageState(res.data.settings.language);
        } else {
          console.debug(
            "[I18n] server settings did not include language, keeping",
            { language },
          );
        }
      } catch (e) {
        // ignore network/auth errors
      }
    })();
  }, []);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    try {
      await settingsApi.update({ language: lang });
    } catch (e) {
      // ignore if not authenticated; fallback to localStorage
      localStorage.setItem(
        "esl_user_settings",
        JSON.stringify({ language: lang }),
      );
    }
  };

  const t = (key) => {
    return translations[language]?.[key] ?? translations["fr"]?.[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
