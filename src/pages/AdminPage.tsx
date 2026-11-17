import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, Search, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { getTopicRef, getTrack } from '../content/curriculum';
import type { SpecialityId } from '../content/types';
import { dayKey, shiftDay } from '../engine/dates';
import { fetchLearners, type AdminRow } from '../services/admin';
import { useAuth } from '../store/auth';
import { Bar, pct } from '../components/ui';

function formatDay(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function specialityTitle(id: string | null | undefined): string {
  if (!id) return 'Tanlanmagan';
  try {
    return getTrack(id as SpecialityId).title;
  } catch {
    return id;
  }
}

export function AdminPage() {
  const user = useAuth((s) => s.user);
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchLearners());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) void load();
  }, [user?.isAdmin]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const today = dayKey();
    const weekAgo = shiftDay(today, -6);
    const activeToday = list.filter((r) => r.summary?.lastActiveDay === today).length;
    const activeWeek = list.filter((r) => (r.summary?.lastActiveDay ?? '') >= weekAgo).length;
    const withData = list.filter((r) => r.summary);
    const avg = withData.length ? withData.reduce((s, r) => s + (r.summary?.ratio ?? 0), 0) / withData.length : 0;
    const counts = new Map<string, number>();
    for (const r of list) for (const id of r.summary?.doneTopicIds ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    const topTopics = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const bySpeciality = new Map<string, number>();
    for (const r of list) {
      const key = specialityTitle(r.summary?.speciality);
      bySpeciality.set(key, (bySpeciality.get(key) ?? 0) + 1);
    }
    return { total: list.length, activeToday, activeWeek, avg, topTopics, bySpeciality: [...bySpeciality.entries()] };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) => r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, query]);

  if (!user?.isAdmin) {
    return (
      <div className="page narrow">
        <div className="empty">
          <ShieldAlert />
          <h3>Bu sahifa faqat admin uchun</h3>
          <p>
            <Link to="/akkaunt">Akkaunt sahifasiga qaytish</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head row between wrap">
        <div>
          <h1 className="page-title">Admin panel</h1>
          <p className="page-sub">Foydalanuvchilar va ularning o'qish progressi.</p>
        </div>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw /> Yangilash
        </button>
      </header>

      {error && <div className="auth-msg error">{error}</div>}

      <div className="grid c4" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <span className="stat-label">
            <Users /> Jami foydalanuvchilar
          </span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">
            <Activity /> Bugun faol
          </span>
          <span className="stat-value">{stats.activeToday}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">
            <Activity /> Oxirgi 7 kunda faol
          </span>
          <span className="stat-value">{stats.activeWeek}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">
            <TrendingUp /> O'rtacha progress
          </span>
          <span className="stat-value">{pct(stats.avg)}</span>
        </div>
      </div>

      <div className="grid c2" style={{ marginBottom: 20 }}>
        <section className="card pad">
          <h2 className="admin-h">Eng ko'p tugatilgan mavzular</h2>
          {stats.topTopics.length === 0 ? (
            <p className="small muted">Hali hech kim mavzu tugatmagan.</p>
          ) : (
            <ol className="admin-list">
              {stats.topTopics.map(([id, n]) => (
                <li key={id}>
                  <Link to={`/mavzu/${id}`}>{getTopicRef(id)?.topic.title ?? id}</Link>
                  <span className="faint">{n} kishi</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="card pad">
          <h2 className="admin-h">Yo'nalishlar</h2>
          <ol className="admin-list">
            {stats.bySpeciality.map(([title, n]) => (
              <li key={title}>
                <span>{title}</span>
                <span className="faint">{n} kishi</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card">
        <div className="admin-toolbar">
          <div className="search" style={{ maxWidth: 320, flex: 1 }}>
            <Search />
            <input className="input" placeholder="Ism yoki email bo'yicha qidirish" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="small faint">{filtered.length} ta</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>Yo'nalish</th>
                <th>Progress</th>
                <th>Mavzular</th>
                <th>Ketma-ket</th>
                <th>O'qigan vaqti</th>
                <th>Ro'yxatdan o'tgan</th>
                <th>Oxirgi faollik</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.summary?.name || r.name || '—'}</strong>
                    {r.isAdmin && <span className="chip tone" style={{ marginLeft: 6 }}>admin</span>}
                    <div className="small faint">{r.email}</div>
                  </td>
                  <td>{specialityTitle(r.summary?.speciality)}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="small">{pct(r.summary?.ratio ?? 0)}</div>
                    <Bar value={r.summary?.ratio ?? 0} />
                  </td>
                  <td>
                    {r.summary ? `${r.summary.topicsDone} / ${r.summary.topicsTotal}` : '—'}
                  </td>
                  <td>{r.summary ? `${r.summary.streak} kun` : '—'}</td>
                  <td>{r.summary ? `${Math.round(r.summary.minutesTotal / 6) / 10} soat` : '—'}</td>
                  <td>{formatDay(r.createdAt)}</td>
                  <td>{r.summary?.lastActiveDay ?? formatDay(r.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows && rows.length === 0 && <p className="small muted" style={{ padding: 16 }}>Hali foydalanuvchi yo'q.</p>}
      </section>
    </div>
  );
}
