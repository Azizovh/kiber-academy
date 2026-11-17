import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CloudOff, LogOut, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { AuthPanel } from '../components/AuthPanel';
import { useAuth } from '../store/auth';
import { signOut, syncManually, updatePassword } from '../services/sync';

function timeAgo(iso: string | null): string {
  if (!iso) return 'hali saqlanmagan';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'hozirgina';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiqa oldin`;
  return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function NewPasswordForm() {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMsg({ ok: false, text: "Parol kamida 8 belgidan iborat bo'lsin." });
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setMsg({ ok: true, text: 'Yangi parol saqlandi.' });
      useAuth.getState().set({ recovery: false });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card pad stack" onSubmit={(e) => void onSubmit(e)}>
      <h2 className="admin-h">Yangi parol o'rnating</h2>
      <div className="field">
        <label htmlFor="new-password">Yangi parol</label>
        <input id="new-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      {msg && <div className={`auth-msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      <div>
        <button className="btn primary" type="submit" disabled={busy}>
          Saqlash
        </button>
      </div>
    </form>
  );
}

export function AccountPage() {
  const { status, user, sync, syncError, lastSync, recovery } = useAuth();
  const [busy, setBusy] = useState(false);

  if (status === 'disabled') {
    return (
      <div className="page narrow">
        <header className="page-head">
          <h1 className="page-title">Akkaunt</h1>
        </header>
        <div className="empty">
          <CloudOff />
          <h3>Bu nusxada akkauntlar yoqilmagan</h3>
          <p>
            Progress shu qurilmada saqlanadi. Bulut sinxroni uchun dastur Supabase kalitlari bilan yig'ilishi kerak
            (docs/SUPABASE.md).
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="page narrow">
        <p className="muted">Yuklanmoqda…</p>
      </div>
    );
  }

  if (status === 'guest' || !user) {
    return (
      <div className="page narrow">
        <header className="page-head">
          <h1 className="page-title">Akkaunt</h1>
          <p className="page-sub">
            Akkaunt ixtiyoriy. Kirsangiz, progressingiz bulutda saqlanadi va telefon, kompyuter va ish stoli ilovasi
            o'rtasida sinxronlanadi. Shu qurilmadagi hozirgi progress akkauntga qo'shiladi — hech narsa yo'qolmaydi.
          </p>
        </header>
        <div className="card pad auth-card">
          <AuthPanel />
        </div>
        {syncError && <div className="auth-msg error" style={{ marginTop: 14 }}>{syncError}</div>}
      </div>
    );
  }

  const onSync = async () => {
    setBusy(true);
    await syncManually();
    setBusy(false);
  };

  const onSignOut = async () => {
    const ok = window.confirm(
      "Akkauntdan chiqasizmi? Progress bulutda saqlanib qoladi, shu qurilmadan esa o'chiriladi (keyingi foydalanuvchi toza boshlaydi).",
    );
    if (!ok) return;
    setBusy(true);
    await signOut();
    setBusy(false);
  };

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1 className="page-title">Akkaunt</h1>
      </header>

      {recovery && <NewPasswordForm />}

      <section className="card pad stack" style={{ marginTop: recovery ? 16 : 0 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="account-avatar">
            <UserRound />
          </span>
          <div>
            <strong>{user.name || user.email}</strong>
            <div className="small muted">{user.email}</div>
          </div>
          {user.isAdmin && (
            <span className="chip tone" style={{ marginLeft: 'auto' }}>
              <ShieldCheck /> Admin
            </span>
          )}
        </div>

        <div className={`sync-line ${sync}`}>
          <span className="sync-dot" />
          {sync === 'syncing' ? 'Sinxronlanmoqda…' : sync === 'error' ? 'Sinxronda xato' : `Saqlangan: ${timeAgo(lastSync)}`}
        </div>
        {syncError && <div className="auth-msg error">{syncError}</div>}

        <div className="row wrap">
          <button className="btn" onClick={() => void onSync()} disabled={busy || sync === 'syncing'}>
            <RefreshCw /> Hozir sinxronlash
          </button>
          {user.isAdmin && (
            <Link className="btn" to="/admin">
              <ShieldCheck /> Admin panel
            </Link>
          )}
          <button className="btn danger" onClick={() => void onSignOut()} disabled={busy}>
            <LogOut /> Chiqish
          </button>
        </div>
      </section>

      <p className="small faint" style={{ marginTop: 16 }}>
        Har bir o'zgarish bir necha soniyadan keyin avtomatik saqlanadi. Ikki qurilmada o'qisangiz, ikkalasidagi
        progress birlashtiriladi: o'tilgan mavzular, maqsadlar, lablar, faollik kunlari, kartochkalar va qaydlar.
      </p>
    </div>
  );
}
