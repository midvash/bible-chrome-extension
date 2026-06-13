import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchVerse } from '../lib/api';
import { readerUrl } from '../lib/url';
import type { Locale, VerseResponse } from '../types';
import './sidepanel.css';

const t = (key: string): string => {
  try {
    return chrome.i18n.getMessage(key) || key;
  } catch {
    return key;
  }
};

interface PanelParams {
  version: string;
  book: string;
  chapter: number;
  v1?: number;
  v2?: number;
  locale: Locale;
  bookName: string;
}

function parseParams(search: string): PanelParams | null {
  const p = new URLSearchParams(search);
  const version = p.get('version');
  const book = p.get('book');
  const chapterRaw = p.get('chapter');
  if (!version || !book || !chapterRaw) return null;
  const chapter = parseInt(chapterRaw, 10);
  if (!Number.isFinite(chapter)) return null;
  const v1Raw = p.get('v1');
  const v2Raw = p.get('v2');
  return {
    version,
    book,
    chapter,
    v1: v1Raw ? parseInt(v1Raw, 10) : undefined,
    v2: v2Raw ? parseInt(v2Raw, 10) : undefined,
    locale: ((p.get('locale') as Locale | null) ?? 'en') as Locale,
    bookName: p.get('bookName') ?? book,
  };
}

function buildReference(params: PanelParams): string {
  const { bookName, chapter, v1, v2 } = params;
  if (!v1) return `${bookName} ${chapter}`;
  if (v2 && v2 !== v1) return `${bookName} ${chapter}:${v1}-${v2}`;
  return `${bookName} ${chapter}:${v1}`;
}

function App() {
  const [params, setParams] = useState<PanelParams | null>(() =>
    parseParams(window.location.search),
  );
  const [verse, setVerse] = useState<VerseResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Observa mudança de URL (background atualiza setOptions com novo path).
  useEffect(() => {
    const onPop = () => {
      const next = parseParams(window.location.search);
      setParams(next);
    };
    window.addEventListener('popstate', onPop);
    // Polling leve — `setOptions` no MV3 não dispara popstate. Checa a cada
    // 500ms se a query mudou. Custo desprezível, é uma comparação de string.
    let last = window.location.search;
    const poll = window.setInterval(() => {
      if (window.location.search !== last) {
        last = window.location.search;
        setParams(parseParams(last));
      }
    }, 500);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!params) {
      setVerse(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVerse(params.version, params.book, params.chapter, params.v1, params.v2)
      .then((v) => {
        if (cancelled) return;
        setVerse(v);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params?.version, params?.book, params?.chapter, params?.v1, params?.v2]);

  // Navegação Anterior/Próximo (verso ou capítulo).
  const goPrev = useCallback(() => {
    setParams((curr) => {
      if (!curr) return curr;
      if (curr.v1) {
        const v1 = Math.max(1, curr.v1 - 1);
        return { ...curr, v1, v2: undefined };
      }
      if (curr.chapter > 1) {
        return { ...curr, chapter: curr.chapter - 1, v1: undefined, v2: undefined };
      }
      return curr;
    });
  }, []);
  const goNext = useCallback(() => {
    setParams((curr) => {
      if (!curr) return curr;
      if (curr.v1) {
        return { ...curr, v1: curr.v1 + 1, v2: undefined };
      }
      return { ...curr, chapter: curr.chapter + 1, v1: undefined, v2: undefined };
    });
  }, []);
  const goChapter = useCallback(() => {
    setParams((curr) => (curr ? { ...curr, v1: undefined, v2: undefined } : curr));
  }, []);

  if (!params) {
    return (
      <div className="panel">
        <div className="panel__body">
          <p className="panel__empty">{t('tooltipLoading')}</p>
        </div>
      </div>
    );
  }

  const reference = buildReference(params);
  const fullReaderHref = readerUrl(
    params.locale,
    params.version,
    params.book,
    params.chapter,
    params.v1,
    params.v2,
  );

  return (
    <div className="panel">
      <header className="panel__header">
        <div className="panel__brand">Midvash</div>
        <h1 className="panel__reference">{reference}</h1>
        <div className="panel__version">{params.version.toUpperCase()}</div>
      </header>

      <div className="panel__nav">
        <button
          type="button"
          className="panel__nav-button"
          onClick={goPrev}
          disabled={loading || (((params.v1 ?? 0) <= 1) && params.chapter <= 1)}
        >
          ← {params.v1 ? t('navPrevVerse') : t('navPrevChapter')}
        </button>
        {params.v1 && (
          <button type="button" className="panel__nav-button" onClick={goChapter} disabled={loading}>
            {t('navWholeChapter')}
          </button>
        )}
        <button
          type="button"
          className="panel__nav-button"
          onClick={goNext}
          disabled={loading}
        >
          {params.v1 ? t('navNextVerse') : t('navNextChapter')} →
        </button>
      </div>

      <div className="panel__body">
        {loading && !verse && <p className="panel__loading">{t('tooltipLoading')}</p>}
        {error && <p className="panel__error">{t('tooltipUnavailable')}</p>}
        {verse && verse.data.text && <p className="panel__verse">{verse.data.text}</p>}
        {verse && !verse.data.text && verse.data.verses?.length
          ? verse.data.verses.map((vText, i) => (
              <p key={i} className="panel__verse">
                <sup className="panel__verse-num">{i + 1}</sup>
                {vText}
              </p>
            ))
          : null}
      </div>

      <footer className="panel__footer">
        <a
          className="panel__open-link"
          href={fullReaderHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('tooltipReadMore')} ↗
        </a>
      </footer>
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
