import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { isDesktop } from '../services/supabase';
import { sendPasswordReset, signIn, signInWithGoogle, signUp } from '../services/sync';

type Mode = 'signin' | 'signup' | 'reset';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

/** Sign in, sign up and password reset in one card. Google is hidden in the desktop window (see services/supabase). */
export function AuthPanel({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const mail = email.trim();
      if (mode === 'signin') await signIn(mail, password);
      else if (mode === 'signup') {
        if (password.length < 8) throw new Error("Parol kamida 8 belgidan iborat bo'lsin.");
        const { needsConfirmation } = await signUp(mail, password, name.trim());
        if (needsConfirmation) setInfo(`${mail} manziliga tasdiqlash xati yuborildi. Xatdagi havolani bosing, keyin shu yerda kiring.`);
      } else {
        await sendPasswordReset(mail);
        setInfo("Parolni tiklash havolasi emailingizga yuborildi.");
      }
    });
  };

  return (
    <div className="auth-panel">
      {mode !== 'reset' && (
        <div className="seg auth-tabs">
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => switchTo('signin')}>
            Kirish
          </button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => switchTo('signup')}>
            Ro'yxatdan o'tish
          </button>
        </div>
      )}

      {mode !== 'reset' && !isDesktop && (
        <>
          <button type="button" className="btn lg auth-google" disabled={busy} onClick={() => void run(signInWithGoogle)}>
            <GoogleMark /> Google orqali {mode === 'signup' ? "ro'yxatdan o'tish" : 'kirish'}
          </button>
          <div className="auth-or">
            <span>yoki email bilan</span>
          </div>
        </>
      )}

      <form className="stack" onSubmit={onSubmit}>
        {mode === 'reset' && (
          <p className="small muted">Emailingizni yozing — parolni yangilash havolasini yuboramiz.</p>
        )}
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="auth-name">Ism</label>
            <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        {mode !== 'reset' && (
          <div className="field">
            <label htmlFor="auth-password">Parol</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {mode === 'signup' && <div className="hint">Kamida 8 belgi. Boshqa saytlardagi parolingizni ishlatmang.</div>}
          </div>
        )}

        {error && <div className="auth-msg error">{error}</div>}
        {info && <div className="auth-msg ok">{info}</div>}

        <button className="btn primary lg" type="submit" disabled={busy}>
          <Mail />
          {mode === 'signin' ? 'Kirish' : mode === 'signup' ? "Ro'yxatdan o'tish" : 'Havolani yuborish'}
        </button>

        <div className="row between small">
          {mode === 'signin' ? (
            <button type="button" className="link-btn" onClick={() => switchTo('reset')}>
              Parolni unutdingizmi?
            </button>
          ) : mode === 'reset' ? (
            <button type="button" className="link-btn" onClick={() => switchTo('signin')}>
              ← Kirishga qaytish
            </button>
          ) : (
            <span />
          )}
        </div>
      </form>

      {isDesktop && mode !== 'reset' && (
        <p className="small faint">
          Google orqali kirish faqat saytda ishlaydi. Agar akkauntni Google bilan ochgan bo'lsangiz, saytda "Parolni
          unutdingizmi?" orqali parol o'rnating — keyin shu yerda email va parol bilan kirasiz.
        </p>
      )}
    </div>
  );
}
