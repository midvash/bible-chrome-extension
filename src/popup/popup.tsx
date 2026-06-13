import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getPrefs, updatePrefs } from '../lib/storage';
import { getVersions } from '../lib/books-cache';
import { matchLocale } from '../lib/locale';
import { isAlwaysBlocked, isUserBlocked } from '../lib/blocklist';
import {
  DEFAULT_VERSIONS,
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

function localeFromVersionLanguage(lang: string): Locale | null {
  return matchLocale(lang);
}

function App() {
  const [prefs, setPrefs] = useState<ExtensionPrefs | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [tabHost, setTabHost] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const [p, v, tabs] = await Promise.all([
        getPrefs(),
        getVersions().catch(() => [] as VersionEntry[]),
        chrome.tabs.query({ active: true, currentWindow: true }),
      ]);
      setPrefs(p);
      setVersions(v);
      const url = tabs[0]?.url;
      if (url) {
        try {
          const parsed = new URL(url);
          // Só consideramos sites reais — http(s). Páginas internas do Chrome
          // (chrome://, edge://, about:, chrome-extension://, view-source:,
          // file://) não fazem sentido pro bloco contextual.
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            setTabHost(parsed.host.toLowerCase());
          }
        } catch {
          /* noop */
        }
      }
    })();
  }, []);

  if (!prefs) {
    return <div className="popup">{t('loading')}</div>;
  }

  const tabAlwaysBlocked = !!tabHost && isAlwaysBlocked(tabHost);
  const tabUserBlocked = !!tabHost && isUserBlocked(tabHost, prefs.blacklist);

  const update = async (partial: Partial<ExtensionPrefs>) => {
    const next = await updatePrefs(partial);
    setPrefs(next);
  };

  const blockCurrentSite = async () => {
    if (!tabHost || tabAlwaysBlocked || tabUserBlocked) return;
    await update({ blacklist: [...prefs.blacklist, tabHost] });
  };

  const unblockCurrentSite = async () => {
    if (!tabHost) return;
    // Remove o host exato e também eventuais entradas de domínio raiz que
    // possam estar cobrindo o host (ex: "foo.com" cobre "www.foo.com").
    const next = prefs.blacklist.filter((entry) => {
      if (entry === tabHost) return false;
      if (tabHost.endsWith(`.${entry}`)) return false;
      return true;
    });
    await update({ blacklist: next });
  };

  const pageLocale = detectFromTabHost();
  const versionsForLocale = (loc: Locale) =>
    versions.filter((v) => localeFromVersionLanguage(v.language) === loc);

  return (
    <div className="popup">
      <header className="popup__header">
        <h1 className="popup__title">Midvash</h1>
      </header>

      <div className="popup__row">
        <span className="popup__label">{t('popupEnabled')}</span>
        <label className="popup__switch">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          <span className="slider" />
        </label>
      </div>

      {/* Bloco contextual do site atual da aba */}
      {tabAlwaysBlocked && (
        <div className="popup__site-block popup__site-block--locked" role="status">
          <p className="popup__site-block-message">
            {t('popupAlwaysBlockedExplanation')}
          </p>
          <span className="popup__site-block-host">{tabHost}</span>
        </div>
      )}

      {tabHost && !tabAlwaysBlocked && tabUserBlocked && (
        <div className="popup__site-block" role="status">
          <p className="popup__site-block-message">
            {t('popupCurrentSiteBlocked')}
          </p>
          <span className="popup__site-block-host">{tabHost}</span>
          <button
            type="button"
            className="popup__action-button popup__action-button--secondary"
            onClick={() => void unblockCurrentSite()}
          >
            {t('popupActivateOnSite')}
          </button>
        </div>
      )}

      {tabHost && !tabAlwaysBlocked && !tabUserBlocked && (
        <div className="popup__site-block">
          <span className="popup__site-block-host">{tabHost}</span>
          <button
            type="button"
            className="popup__action-button"
            onClick={() => void blockCurrentSite()}
          >
            {t('popupBlockOnSite')}
          </button>
        </div>
      )}

      <div className="popup__row">
        <span className="popup__label">{t('popupShowTooltip')}</span>
        <label className="popup__switch">
          <input
            type="checkbox"
            checked={prefs.showTooltip}
            onChange={(e) => update({ showTooltip: e.target.checked })}
          />
          <span className="slider" />
        </label>
      </div>

      {pageLocale && (
        <div className="popup__row">
          <span className="popup__label">{t('popupVersionForLocale')}</span>
          <select
            className="popup__select"
            value={prefs.versionByLocale[pageLocale] ?? DEFAULT_VERSIONS[pageLocale]}
            onChange={(e) =>
              update({
                versionByLocale: {
                  ...prefs.versionByLocale,
                  [pageLocale]: e.target.value,
                },
              })
            }
          >
            {versionsForLocale(pageLocale).map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.shortName} — {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="popup__row">
        <span className="popup__label">{t('popupOpenInLabel')}</span>
        <select
          className="popup__select"
          value={prefs.openIn ?? 'tab'}
          onChange={(e) =>
            update({ openIn: e.target.value as 'tab' | 'sidePanel' })
          }
        >
          <option value="tab">{t('popupOpenInTab')}</option>
          <option value="sidePanel">{t('popupOpenInSidePanel')}</option>
        </select>
      </div>
      <p className="popup__hint">{t('popupOpenInHint')}</p>

      <div className="popup__footer">
        <button
          className="popup__link"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          {t('popupOptions')}
        </button>
        <a
          className="popup__link"
          href="https://midvash.app/chrome-extension"
          target="_blank"
          rel="noopener noreferrer"
        >
          midvash.app
        </a>
      </div>
    </div>
  );
}

function detectFromTabHost(): Locale | null {
  const browserLang = chrome.i18n.getUILanguage?.() ?? navigator.language;
  return matchLocale(browserLang) ?? 'en';
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
