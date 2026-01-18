'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Tense } from './api/tense/route';
import type { Question } from './api/question/route';

const persons = ["yo", "tú", "él/ella/usted", "nosotros", "vosotros", "ellos/ellas/ustedes"];

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
  const [authError, setAuthError] = useState('');
  const [generateCount, setGenerateCount] = useState('20');
  const infoTouchStart = useRef<{ x: number; y: number } | null>(null);

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

  const generateQuestions = useCallback(() => {
      setIsGenerating(true);
      console.log(`Generating ${generateCount} questions`);
      fetch(`/api/question?count=${generateCount}&generate=true`)
        .then(res => res.json())
        .then(data => {
          setBaseQuestions(data);
        })
        .catch(err => console.error('Error generating questions:', err))
        .finally(() => setIsGenerating(false));
    }, [generateCount]);

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

  const checkAnswer = useCallback(() => {
    if (drillQuestions.length === 0) return;
    const q = drillQuestions[currentQuestion];
    const isCorrect = usKeyboard
      ? normalize(answerInput) === normalize(q.answer)
      : answerInput.trim() === q.answer.trim();
    if (isCorrect) {
      setDrillStatus({ text: 'Correct ✅', className: 'status ok' });
    } else {
      setDrillStatus({ text: `Not quite. Correct: ${q.answer}`, className: 'status bad' });
    }
    setHasChecked(true);
  }, [drillQuestions, currentQuestion, answerInput, usKeyboard]);

  const showAnswer = useCallback(() => {
    if (drillQuestions.length === 0) return;
    const q = drillQuestions[currentQuestion];
    setAnswerInput(q.answer);
    setDrillStatus({ text: `Answer shown: ${q.answer}`, className: 'status' });
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
      setAuthenticated(true);
      setAuthError('');
      return;
    }
    setAuthError('Incorrect password. Please try again.');
    setPassword('');
  }, [password]);

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
        <h1>Spanish Tenses (A1–C1)</h1>
        <div>Loading...</div>
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
              Protected
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>
              Password required
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.35 }}>
              Enter the password to continue.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              authenticate();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <label htmlFor="auth-password" style={{ fontSize: '13px', fontWeight: 650 }}>
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) setAuthError('');
              }}
              autoFocus
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
              Authenticate
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
            <div>Generating</div>
          </div>
        </div>
      )}
      <div className="wrap">
      <h1>Spanish Tenses (A1–C1) {isLarge ? "• Regular Conjugations & Examples" : ""}</h1>
      <div className="tenseSelect">
        <select
          aria-label="Select tense"
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
                    <th>Person</th>
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
          </div>
          <div className="card">
            <h3 style={{ margin: '0 0 6px' }}>Examples</h3>
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
            <div className="panelTabs" role="tablist" aria-label="Tense details">
              <button
                type="button"
                className={`panelTab ${infoPanel === 'conjugations' ? 'active' : ''}`}
                role="tab"
                aria-selected={infoPanel === 'conjugations'}
                onClick={() => setInfoPanel('conjugations')}
              >
                Conjugations
              </button>
              <button
                type="button"
                className={`panelTab ${infoPanel === 'examples' ? 'active' : ''}`}
                role="tab"
                aria-selected={infoPanel === 'examples'}
                onClick={() => setInfoPanel('examples')}
              >
                Examples
              </button>
            </div>
          </div>
          <div className="swipeHint muted">Tip: swipe left/right</div>

          {infoPanel === 'conjugations' ? (
            <div style={{ marginTop: '10px' }} className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
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

      <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        Let's Practice!
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'normal' }}>
          <input
            type="checkbox"
            checked={usKeyboard}
            onChange={(e) => setUsKeyboard(e.target.checked)}
          />
          US Keyboard (sloppy match on spanish letters)
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
                  placeholder="verbo"
                />
                {after}
              </b>
            </div>
            <div className="muted">{currentQ.en}</div>
            <div className={drillStatus.className}>
              {drillStatus.text || `Question ${currentQuestion + 1} of ${drillQuestions.length}`}
            </div>
            <div className="drill-actions">
              <button className={`btn ${!hasChecked ? 'primary' : ''}`} onClick={checkAnswer}>
                Check
              </button>
              <button className="btn" onClick={showHint}>
                Hint
              </button>
              <button className="btn" onClick={showAnswer}>
                Show
              </button>
            </div>
          </>
        )}
      </div>
      <div className="nav">
        <button className="btn ghost" onClick={prevQuestion}>
          Prev
        </button>
        <button className={`btn ${hasChecked ? 'primary' : 'ghost'}`} onClick={nextQuestion}>
          Next
        </button>
        <button className="btn ghost" onClick={reshuffle}>
          Shuffle
        </button>
        <button className="btn ghost" onClick={generateQuestions}>
          Generate
        </button>
        <select className="btn ghost" value={generateCount} onChange={(e) => setGenerateCount(e.target.value)} >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      </div>
    </>
  );
}
