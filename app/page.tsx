'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Tense } from './api/tense/route';
import type { Question } from './api/question/route';

const persons = ["yo", "tú", "él/ella/ud", "nosotros", "vosotros", "ellos/ellas/uds"];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Safari < 14
    // eslint-disable-next-line deprecation/deprecation
    mql.addListener(onChange);
    // eslint-disable-next-line deprecation/deprecation
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function Home() {
  const [tenses, setTenses] = useState<Tense[]>([]);
  const [baseQuestions, setBaseQuestions] = useState<Question[]>([]);
  const [selectedTense, setSelectedTense] = useState<Tense | null>(null);
  const [infoPanel, setInfoPanel] = useState<'conjugations' | 'examples'>('conjugations');
  const isLarge = useMediaQuery('(min-width: 900px)');
  const [drillQuestions, setDrillQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [drillStatus, setDrillStatus] = useState<{ text: string; className: string }>({ text: '', className: 'status' });
  const [usKeyboard, setUsKeyboard] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [generateCount, setGenerateCount] = useState('20');
  const [generateTitle, setGenerateTitle] = useState('');
  const [translationLang, setTranslationLang] = useState<'en' | 'fr'>('en');
  const infoTouchStart = useRef<{ x: number; y: number } | null>(null);

  const [questionSetsModalOpen, setQuestionSetsModalOpen] = useState(false);
  const [availableSets, setAvailableSets] = useState<{ id: string; title: string }[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [useAllTenses, setUseAllTenses] = useState(true);
  const [selectedTenseIds, setSelectedTenseIds] = useState<Set<string>>(new Set());
  const [tenseDropdownOpen, setTenseDropdownOpen] = useState(false);
  const tenseDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch tenses from API
    fetch('/api/tense')
      .then(res => res.json())
      .then(data => {
        setTenses(data);
        if (data.length > 0) {
          setSelectedTense(data[0]);
        }
      })
      .catch(err => console.error('Error fetching tenses:', err));

    // Fetch questions from API
    fetch('/api/question')
      .then(res => res.json())
      .then(data => {
        setBaseQuestions(data);
      })
      .catch(err => console.error('Error fetching questions:', err));
  }, []);

  const generateQuestions = useCallback((count: string, tenses: string[] | null, title?: string) => {
    if (!username) return;
    setIsGenerating(true);
    const params = new URLSearchParams({ count, generate: 'true', username });
    if (tenses && tenses.length > 0) params.set('tenses', tenses.join(','));
    const t = (title ?? '').trim();
    if (t) params.set('title', t);
    fetch(`/api/question?${params}`)
      .then(res => res.json())
      .then((data: { questions?: Question[] } | Question[]) => {
        const qs = Array.isArray(data) ? data : (data.questions ?? []);
        setBaseQuestions(qs);
      })
      .catch(err => console.error('Error generating questions:', err))
      .finally(() => setIsGenerating(false));
  }, [username]);

  const fetchQuestionSetList = useCallback(() => {
    if (!username) return;
    fetch(`/api/question?list=true&username=${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then((data: { sets: { id: string; title: string }[] }) => {
        const sets = Array.isArray(data?.sets) ? data.sets : [];
        setAvailableSets(sets);
        setSelectedSetId('');
      })
      .catch(err => console.error('Error fetching question set list:', err));
  }, [username]);

  const openQuestionSetsModal = useCallback(() => {
    setQuestionSetsModalOpen(true);
    fetchQuestionSetList();
  }, [fetchQuestionSetList]);

  const selectQuestionSet = useCallback((id: string) => {
    if (!id || !username) return;
    fetch(`/api/question?id=${encodeURIComponent(id)}&username=${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then((data: Question[] | { questions?: Question[] } | null) => {
        const qs = data == null
          ? []
          : Array.isArray(data)
            ? data
            : (data.questions ?? []);
        setBaseQuestions(qs);
        setQuestionSetsModalOpen(false);
      })
      .catch(err => console.error('Error fetching question set:', err));
  }, [username]);

  const handleGenerateFromModal = useCallback(() => {
    setQuestionSetsModalOpen(false);
    const tenses = useAllTenses ? null : Array.from(selectedTenseIds);
    const title = generateTitle.trim() || `${generateCount} preguntas`;
    generateQuestions(generateCount, tenses, title);
  }, [generateCount, generateTitle, useAllTenses, selectedTenseIds, generateQuestions]);

  const toggleTense = useCallback((id: string) => {
    setUseAllTenses(false);
    setSelectedTenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllTenses = useCallback(() => {
    setUseAllTenses(true);
    setSelectedTenseIds(new Set());
  }, []);

  const reshuffle = useCallback(() => {
    if (baseQuestions.length === 0) return;
    const shuffled = shuffleArray(baseQuestions);
    setDrillQuestions(shuffled);
    setCurrentQuestion(0);
    setAnswerInput('');
    setDrillStatus({ text: '', className: 'status' });
    setHasChecked(false);
  }, [baseQuestions]);

  useEffect(() => {
    if (baseQuestions.length > 0) {
      reshuffle();
    }
  }, [baseQuestions, reshuffle]);

  useEffect(() => {
    if (!tenseDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (tenseDropdownRef.current && !tenseDropdownRef.current.contains(e.target as Node)) {
        setTenseDropdownOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [tenseDropdownOpen]);

  const checkAnswer = useCallback(() => {
    if (drillQuestions.length === 0) return;
    const q = drillQuestions[currentQuestion];
    const isCorrect = usKeyboard
      ? normalize(answerInput) === normalize(q.answer)
      : answerInput.trim() === q.answer.trim();
    if (isCorrect) {
      setDrillStatus({ text: 'Correcto ✅', className: 'status ok' });
    } else {
      setDrillStatus({ text: `No es correcto. Correcto: ${q.answer}`, className: 'status bad' });
    }
    setHasChecked(true);
  }, [drillQuestions, currentQuestion, answerInput, usKeyboard]);

  const showAnswer = useCallback(() => {
    if (drillQuestions.length === 0) return;
    const q = drillQuestions[currentQuestion];
    setAnswerInput(q.answer);
    setDrillStatus({ text: `Respuesta mostrada: ${q.answer}`, className: 'status' });
  }, [drillQuestions, currentQuestion]);

  const showHint = useCallback(() => {
    if (drillQuestions.length === 0) return;
    const q = drillQuestions[currentQuestion];
    const matchingTense = tenses.find((t) => t.id === q.tense);
    if (matchingTense) {
      setSelectedTense(matchingTense);
    }
  }, [drillQuestions, currentQuestion, tenses]);

  const nextQuestion = useCallback(() => {
    if (drillQuestions.length === 0) return;
    setCurrentQuestion((prev) => (prev + 1) % drillQuestions.length);
    setAnswerInput('');
    setDrillStatus({ text: '', className: 'status' });
    setHasChecked(false);
  }, [drillQuestions.length]);

  const prevQuestion = useCallback(() => {
    if (drillQuestions.length === 0) return;
    setCurrentQuestion((prev) => (prev - 1 + drillQuestions.length) % drillQuestions.length);
    setAnswerInput('');
    setDrillStatus({ text: '', className: 'status' });
    setHasChecked(false);
  }, [drillQuestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hasChecked) {
        nextQuestion();
      } else {
        checkAnswer();
      }
    }
  };

  const authenticate = useCallback(() => {
    if (password === 'secreto') {
      if (!username.trim()) {
        setAuthError('Por favor ingresa un nombre de usuario.');
        return;
      }
      setAuthenticated(true);
      setAuthError('');
      return;
    }
    setAuthError('Contraseña incorrecta. Por favor intenta de nuevo.');
    setPassword('');
  }, [password, username]);

  const currentQ = drillQuestions[currentQuestion];
  const [before, after] = currentQ?.es.split('__') || ['', ''];

  const handleInfoTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    infoTouchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleInfoTouchEnd = (e: React.TouchEvent) => {
    const start = infoTouchStart.current;
    infoTouchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    // Require a fairly intentional horizontal swipe.
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx < 0) setInfoPanel('examples'); // swipe left
    else setInfoPanel('conjugations'); // swipe right
  };

  if (!selectedTense || tenses.length === 0) {
    return (
      <div className="wrap">
        <h1>Tiempos verbales (A1–C1)</h1>
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <>{!authenticated && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(17, 24, 39, 0.35)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '18px',
      }}>
        <div
          style={{
            width: '420px',
            maxWidth: '100%',
            background: 'var(--card)',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 16px 45px rgba(0, 0, 0, 0.22)',
            color: 'var(--ink)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Protegido
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>
              Contraseña requerida
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.35 }}>
              Ingresa el nombre de usuario y la contraseña para continuar.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              authenticate();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <label htmlFor="auth-username" style={{ fontSize: '13px', fontWeight: 650 }}>
              Nombre de usuario
            </label>
            <input
              id="auth-username"
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (authError) setAuthError('');
              }}
              autoFocus
              autoComplete="username"
              spellCheck={false}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <label htmlFor="auth-password" style={{ fontSize: '13px', fontWeight: 650 }}>
              Contraseña
            </label>
            <input
              id="auth-password"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) setAuthError('');
              }}
              autoComplete="current-password"
              spellCheck={false}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '14px',
                outline: 'none',
              }}
            />

            {authError && (
              <div
                role="alert"
                style={{
                  fontSize: '13px',
                  color: 'var(--bad)',
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.22)',
                  borderRadius: '10px',
                  padding: '8px 10px',
                }}
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="btn primary"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                borderRadius: '10px',
              }}
            >
              Autenticar
            </button>
          </form>
        </div>
      </div>
    )}
      {isGenerating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--ink)',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}></div>
            <div>Generando</div>
          </div>
        </div>
      )}
      {questionSetsModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17, 24, 39, 0.35)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '18px',
          }}
        >
          <div
            style={{
              width: '50vw',
              minWidth: '320px',
              maxWidth: '640px',
              height: '50vh',
              minHeight: '360px',
              maxHeight: '85vh',
              overflow: 'auto',
              background: 'var(--card)',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 16px 45px rgba(0, 0, 0, 0.22)',
              color: 'var(--ink)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Conjuntos de preguntas</h3>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setQuestionSetsModalOpen(false)}
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            <section style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                Cargar conjunto existente
              </div>
              <select
                aria-label="Seleccionar conjunto de preguntas"
                value={selectedSetId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedSetId(id);
                  if (id) selectQuestionSet(id);
                }}
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  fontSize: '14px',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                }}
              >
                <option value="">Seleccionar</option>
                {availableSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </section>

            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                margin: '20px 0 24px',
              }}
              aria-hidden
            />

            <section>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                Generar nuevo conjunto
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="generate-title" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Título
                </label>
                <input
                  id="generate-title"
                  type="text"
                  value={generateTitle}
                  onChange={(e) => setGenerateTitle(e.target.value)}
                  placeholder={`ej. ${generateCount} preguntas`}
                  style={{
                    width: '100%',
                    border: '1px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleGenerateFromModal}
                  disabled={isGenerating}
                >
                  Generar
                </button>
                <span>aproximadamente</span>
                <select
                  aria-label="Número de preguntas"
                  className="btn ghost"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(e.target.value)}
                  style={{ padding: '6px 10px' }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>preguntas en </span>
                <div ref={tenseDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTenseDropdownOpen((o) => !o);
                    }}
                    aria-expanded={tenseDropdownOpen}
                    aria-haspopup="listbox"
                    style={{ padding: '6px 10px', minWidth: '140px' }}
                  >
                    {useAllTenses
                      ? 'Todos los tiempos'
                      : selectedTenseIds.size === 0
                        ? 'Seleccionar tiempos'
                        : `${selectedTenseIds.size} tiempo${selectedTenseIds.size !== 1 ? 's' : ''} seleccionado${selectedTenseIds.size !== 1 ? 's' : ''}`}
                  </button>
                  {tenseDropdownOpen && (
                    <div
                      role="listbox"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        background: 'var(--card)',
                        border: '1px solid #d1d5db',
                        borderRadius: '10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '8px',
                        minWidth: '200px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        zIndex: 10,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderRadius: '6px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={useAllTenses}
                          onChange={selectAllTenses}
                        />
                        <span style={{ fontWeight: 600 }}>Todos</span>
                      </label>
                      {tenses.map((t) => (
                        <label
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!useAllTenses && selectedTenseIds.has(t.id)}
                            onChange={() => toggleTense(t.id)}
                          />
                          <span>{t.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
      <div className="wrap">
      <h1>Tiempos verbales (A1–C1) {isLarge ? "• Conjugaciones y Ejemplos" : ""}</h1>
      <div className="tenseSelect">
        <select
          aria-label="Seleccionar tiempo"
          value={selectedTense.id}
          onChange={(e) => {
            const next = tenses.find((t) => t.id === e.target.value);
            if (next) setSelectedTense(next);
          }}
        >
          {tenses.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="chips tenseChips">
        {tenses.map((t) => (
          <div
            key={t.id}
            className={`chip ${selectedTense.id === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTense(t)}
          >
            {t.name}
          </div>
        ))}
      </div>

      {isLarge ? (
        <div className="grid">
          <div className="card">
            <h3 style={{ margin: '0 0 6px' }}>
              {selectedTense.name} — {selectedTense.level}
            </h3>
            <div className="muted">{selectedTense.desc}</div>
            <div style={{ marginTop: '10px' }} className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Persona</th>
                    <th style={{ width: '25%' }}>-ar</th>
                    <th style={{ width: '25%' }}>-er</th>
                    <th style={{ width: '25%' }}>-ir</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, i) => (
                    <tr key={i}>
                      <td>{p}</td>
                      <td>{selectedTense.endings.ar[i]}</td>
                      <td>{selectedTense.endings.er[i]}</td>
                      <td>{selectedTense.endings.ir[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 style={{ margin: '0 0 6px' }}>Ejemplos</h3>
            <ul className="examples">
              {selectedTense.examples.map((ex, i) => (
                <li key={i}>
                  <b>{ex[0]}</b>
                  <br />
                  <span className="muted">{ex[1]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div
          className="card infoCard"
          onTouchStart={handleInfoTouchStart}
          onTouchEnd={handleInfoTouchEnd}
        >
          <div className="infoHeader">
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: '0 0 6px' }}>
                {selectedTense.name} — {selectedTense.level}
              </h3>
              <div className="muted">{selectedTense.desc}</div>
            </div>
            <div className="panelTabs" role="tablist" aria-label="Detalles del tiempo">
              <button
                type="button"
                className={`panelTab ${infoPanel === 'conjugations' ? 'active' : ''}`}
                role="tab"
                aria-selected={infoPanel === 'conjugations'}
                onClick={() => setInfoPanel('conjugations')}
              >
                Conjugaciones
              </button>
              <button
                type="button"
                className={`panelTab ${infoPanel === 'examples' ? 'active' : ''}`}
                role="tab"
                aria-selected={infoPanel === 'examples'}
                onClick={() => setInfoPanel('examples')}
              >
                Ejemplos
              </button>
            </div>
          </div>
          <div className="swipeHint muted">Consejo: desliza izquierda/derecha</div>

          {infoPanel === 'conjugations' ? (
            <div style={{ marginTop: '10px' }} className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>-ar</th>
                    <th>-er</th>
                    <th>-ir</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, i) => (
                    <tr key={i}>
                      <td>{p}</td>
                      <td>{selectedTense.endings.ar[i]}</td>
                      <td>{selectedTense.endings.er[i]}</td>
                      <td>{selectedTense.endings.ir[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <ul className="examples">
                {selectedTense.examples.map((ex, i) => (
                  <li key={i}>
                    <b>{ex[0]}</b>
                    <br />
                    <span className="muted">{ex[1]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      ¡Vamos a practicar!
        <button
          type="button"
          onClick={() => setTranslationLang(translationLang === 'en' ? 'fr' : 'en')}
          title={translationLang === 'en' ? 'Cambiar a traducciones en francés' : 'Cambiar a traducciones en inglés'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '2px 6px',
            borderRadius: '4px',
            lineHeight: 1,
          }}
          aria-label={translationLang === 'en' ? 'Cambiar a traducciones en francés' : 'Cambiar a traducciones en inglés'}
        >
          {translationLang === 'en' ? '🇬🇧' : '🇫🇷'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'normal' }}>
          <input
            type="checkbox"
            checked={usKeyboard}
            onChange={(e) => setUsKeyboard(e.target.checked)}
          />
          Teclado no español {isLarge ? "(coincidencia aproximada en letras españolas)" : ""}
        </label>
      </h2>
      <div className="card drill-card">
        {currentQ && (
          <>
            <div style={{ fontSize: '16px' }}>
              <b>
                {before}
                <input
                  className="answer"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentQ.inf}
                />
                {after}
              </b>
            </div>
            <div className="muted">{translationLang === 'en' ? currentQ.en : currentQ.fr}</div>
            <div className={drillStatus.className}>
              {drillStatus.text || `Pregunta ${currentQuestion + 1} de ${drillQuestions.length}`}
            </div>
            <div className="drill-actions">
              <button className={`btn ${!hasChecked ? 'primary' : ''}`} onClick={checkAnswer}>
                Verificar
              </button>
              <button className="btn" onClick={showHint}>
                Pista
              </button>
              <button className="btn" onClick={showAnswer}>
                Mostrar
              </button>
            </div>
          </>
        )}
      </div>
      <div className="nav">
        <button className="btn ghost" onClick={prevQuestion}>
          Anterior
        </button>
        <button className={`btn ${hasChecked ? 'primary' : 'ghost'}`} onClick={nextQuestion}>
          Siguiente
        </button>
        <button className="btn ghost" onClick={reshuffle}>
          Mezclar
        </button>
        <button className="btn ghost" onClick={openQuestionSetsModal}>
          Conjuntos de preguntas
        </button>
      </div>
      </div>
    </>
  );
}
