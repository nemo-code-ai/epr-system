"use client";

import "./LanguageToggle.css";

export type Locale = "en" | "fr";

type Props = {
  locale: Locale;
  onChange: (next: Locale) => void;
};

/**
 * EN | FR switch. Put it in the header of every screen.
 *
 * Usage (example):
 *   <LanguageToggle
 *     locale={locale}
 *     onChange={async (next) => {
 *       setLocale(next);                                  // re-render with the other messages file
 *       document.cookie = `lang=${next}; path=/; max-age=31536000`;
 *       await supabase.from("profiles").update({ language: next }).eq("id", user.id);
 *     }}
 *   />
 */
export default function LanguageToggle({ locale, onChange }: Props) {
  const isFr = locale === "fr";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isFr}
      aria-label={isFr ? "Langue : français. Passer à l’anglais" : "Language: English. Switch to French"}
      className="lang-toggle"
      data-locale={locale}
      onClick={() => onChange(isFr ? "en" : "fr")}
    >
      <span className="lang-toggle__knob" aria-hidden="true" />
      <span className="lang-toggle__label" aria-hidden="true">EN</span>
      <span className="lang-toggle__label" aria-hidden="true">FR</span>
    </button>
  );
}
