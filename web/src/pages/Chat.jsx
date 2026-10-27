import { useEffect, useRef, useState } from 'react';
import { chatbot } from '@maatricare/shared';

const { LANGUAGES, GREETING, SUGGESTIONS, reply, detectLanguage } = chatbot;
const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN' };
const UI = {
  en: { placeholder: 'Type your question…', send: 'Send', listen: 'Listen', call: 'Call 108', note: 'General guidance only, not a diagnosis. In an emergency call 108.' },
  hi: { placeholder: 'अपना सवाल लिखें…', send: 'भेजें', listen: 'सुनें', call: '108 पर कॉल करें', note: 'यह सामान्य जानकारी है, इलाज नहीं। आपात स्थिति में 108 पर कॉल करें।' },
};
const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

function savedLang() {
  try {
    return localStorage.getItem('mc:lang') ?? 'hi';
  } catch {
    return 'hi';
  }
}

export default function Chat() {
  const [lang, setLang] = useState(savedLang);
  const [messages, setMessages] = useState(() => [{ from: 'bot', text: GREETING[savedLang()] }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const t = UI[lang];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function chooseLang(l) {
    setLang(l);
    try {
      localStorage.setItem('mc:lang', l);
    } catch {}
  }

  function ask(question, label = question) {
    if (!question.trim()) return;
    const l = detectLanguage(question) ?? lang;
    if (l !== lang) chooseLang(l);
    const answer = reply(question, l);
    setMessages((m) => [...m, { from: 'me', text: label }, { from: 'bot', ...answer, lang: l }]);
    setInput('');
  }

  function speak(text, l) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[l];
    speechSynthesis.speak(u);
  }

  function listen() {
    const r = new Recognition();
    r.lang = SPEECH_LANG[lang];
    r.onresult = (e) => ask(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

  return (
    <div className="narrow chat">
      <div className="row between">
        <h1>{lang === 'hi' ? 'स्वास्थ्य सहायक' : 'Health guide'}</h1>
        <div className="tabs">
          {Object.entries(LANGUAGES).map(([k, name]) => (
            <button key={k} className={lang === k ? 'active' : ''} onClick={() => chooseLang(k)}>{name}</button>
          ))}
        </div>
      </div>

      <div className="card messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from} ${m.emergency ? 'emergency' : ''}`}>
            <div className="bubble">{m.text}</div>
            {m.from === 'bot' && (
              <div className="row msg-actions">
                {'speechSynthesis' in window && (
                  <button className="link small" onClick={() => speak(m.text, m.lang ?? lang)}>{UI[m.lang ?? lang].listen}</button>
                )}
                {m.emergency && <a className="button danger" href="tel:108">{UI[m.lang ?? lang].call}</a>}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chips">
        {SUGGESTIONS.map((s) => (
          <button key={s.intent} className="chip" onClick={() => ask(s.intent, s[lang])}>{s[lang]}</button>
        ))}
      </div>

      <form className="row chat-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} />
        {Recognition && (
          <button type="button" onClick={listen} disabled={listening} title="Speak">{listening ? '…' : '🎤'}</button>
        )}
        <button className="primary">{t.send}</button>
      </form>
      <p className="muted small">{t.note}</p>
    </div>
  );
}
