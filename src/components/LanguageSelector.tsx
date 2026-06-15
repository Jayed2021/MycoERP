import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n/languages';
import { changeLanguage } from '../i18n';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = languages.find(l => l.code === i18n.language) ?? languages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-600"
        title={current.nativeName}
      >
        <Globe size={16} />
        <span className="hidden sm:inline font-medium">{current.nativeName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-1 animate-in fade-in">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                lang.code === i18n.language
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex-1">
                <span className="font-medium">{lang.nativeName}</span>
                {lang.name !== lang.nativeName && (
                  <span className="text-gray-400 ml-1.5 text-xs">({lang.name})</span>
                )}
              </span>
              {lang.code === i18n.language && <Check size={14} className="text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
