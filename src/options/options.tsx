import { Fragment, StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getPrefs, updatePrefs } from '../lib/storage';
import { getVersions } from '../lib/books-cache';
import { matchLocale } from '../lib/locale';
import { normalizeHostInput } from '../lib/blocklist';
import {
  ALWAYS_BLOCKED_HOSTS,
  DEFAULT_VERSIONS,
  SUPPORTED_LOCALES,
  type ExtensionPrefs,
  type Locale,
  type VersionEntry,
} from '../types';

const t = (key: string): string => {
  try {
    return chrome.i18n.getMessage(key) || key;
  } catch {
    return key;
  }
};

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'pt-br': 'Português (Brasil)',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  zh: '中文',
  ru: 'Русский',
  ko: '한국어',
};

function App() {
  const [prefs, setPrefs] = useState<ExtensionPrefs | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [savedAt, setSavedAt] = useState<number>(0);
  const [newHost, setNewHost] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const [p, v] = await Promise.all([
        getPrefs(),
        getVersions().catch(() => [] as VersionEntry[]),
      ]);
      setPrefs(p);
      setVersions(v);
    })();
  }, []);

  const versionsByLocale = useMemo(() => {
    const map = new Map<Locale, VersionEntry[]>();
    for (const loc of SUPPORTED_LOCALES) map.set(loc, []);
    for (const v of versions) {
      const loc = matchLocale(v.language);
      if (loc) map.get(loc)!.push(v);
    }
    return map;
  }, [versions]);

  if (!prefs) {
    return <div className="options">{t('loading')}</div>;
  }

  const update = async (partial: Partial<ExtensionPrefs>) => {
    const next = await updatePrefs(partial);
    setPrefs(next);
    setSavedAt(Date.now());
  };

  return (
    <div className="options">
      <h1 className="options__title">Midvash — {t('optionsTitle')}</h1>
      <p className="options__subtitle">{t('optionsSubtitle')}</p>

      <section className="options__section">
        <h2>
          {t('optionsVersionsTitle')}
          <span
            className={`options__saved ${
              Date.now() - savedAt < 1500 ? 'options__saved--visible' : ''
            }`}
          >
            {t('optionsSaved')}
          </span>
        </h2>
        <div className="options__grid">
          {SUPPORTED_LOCALES.map((loc) => {
            const list = versionsByLocale.get(loc) ?? [];
            const value = prefs.versionByLocale[loc] ?? DEFAULT_VERSIONS[loc];
            return (
              <Fragment key={loc}>
                <label htmlFor={`v-${loc}`}>{LOCALE_LABELS[loc]}</label>
                <select
                  id={`v-${loc}`}
                  className="options__select"
                  value={value}
                  onChange={(e) =>
                    update({
                      versionByLocale: {
                        ...prefs.versionByLocale,
                        [loc]: e.target.value,
                      },
                    })
                  }
                >
                  {list.length === 0 && <option value={value}>{value}</option>}
                  {list.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.shortName} — {v.name}
                    </option>
                  ))}
                </select>
              </Fragment>
            );
          })}
        </div>
      </section>

      <section className="options__section">
        <h2>{t('optionsBlacklistTitle')}</h2>
        <p className="options__hint">{t('optionsBlacklistHint')}</p>

        <form
          className="options__add-host"
          onSubmit={(e) => {
            e.preventDefault();
            const cleaned = normalizeHostInput(newHost);
            if (!cleaned) return;
            if (prefs.blacklist.includes(cleaned)) {
              setNewHost('');
              return;
            }
            update({ blacklist: [...prefs.blacklist, cleaned] });
            setNewHost('');
          }}
        >
          <input
            type="text"
            className="options__input"
            placeholder={t('optionsBlacklistPlaceholder')}
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
          <button type="submit" className="options__button">
            {t('optionsBlacklistAdd')}
          </button>
        </form>

        {prefs.blacklist.length > 0 ? (
          <ul className="options__host-list">
            {prefs.blacklist.map((host) => (
              <li key={host} className="options__host-item">
                <span className="options__host-name">{host}</span>
                <button
                  type="button"
                  className="options__host-remove"
                  aria-label={t('optionsBlacklistRemove')}
                  onClick={() =>
                    update({
                      blacklist: prefs.blacklist.filter((h) => h !== host),
                    })
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="options__empty">{t('optionsBlacklistEmpty')}</p>
        )}
      </section>

      <section className="options__section">
        <h2>{t('optionsAlwaysBlockedTitle')}</h2>
        <p className="options__hint">{t('optionsAlwaysBlockedHint')}</p>
        <ul className="options__host-list options__host-list--locked">
          {ALWAYS_BLOCKED_HOSTS.map((host) => (
            <li key={host} className="options__host-item">
              <span className="options__host-name">{host}</span>
              <span className="options__host-locked" aria-hidden="true">
                🔒
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}


const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
