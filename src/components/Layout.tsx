import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BookA,
  Cloud,
  CloudOff,
  Flame,
  Home,
  Layers,
  LogIn,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  MessagesSquare,
  NotebookPen,
  Settings,
  ShieldCheck,
  SquareTerminal,
} from 'lucide-react';
import { useDueCards, useToday } from '../hooks/useLearning';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import { Ring } from './ui';

interface Item {
  to: string;
  label: string;
  icon: typeof Home;
  /** Other path prefixes that keep this item highlighted. */
  also?: string[];
}

const LEARN: Item[] = [
  { to: '/', label: 'Bugun', icon: Home },
  { to: '/xarita', label: "Yo'l xaritasi", icon: Map, also: ['/bosqich', '/mavzu'] },
];
const PRACTICE: Item[] = [
  { to: '/amaliyot', label: 'Amaliyot', icon: SquareTerminal, also: ['/lab', '/ctf'] },
  { to: '/takrorlash', label: 'Takrorlash', icon: Layers },
];
const REFERENCE: Item[] = [
  { to: '/lugat', label: "Lug'at", icon: BookA },
  { to: '/qaydlar', label: 'Qaydlar', icon: NotebookPen },
  { to: '/intervyu', label: 'Intervyu', icon: MessagesSquare },
];

function isActive(pathname: string, item: Item): boolean {
  if (item.to === '/') return pathname === '/';
  return [item.to, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">
        <ShieldCheck size={18} />
      </span>
      <span>
        Kiber<em>Akademiya</em>
      </span>
    </Link>
  );
}

/** Practice pages need the width for the terminal, so the menu folds to icons there unless the learner opens it. */
function isWorkspace(pathname: string): boolean {
  return pathname.startsWith('/lab/') || pathname.startsWith('/ctf/');
}

export function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const due = useDueCards();
  const today = useToday();
  const auth = useAuth();
  const userCollapsed = useUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  // On lab and CTF pages: folded by default; the toggle opens it only until the learner leaves the page.
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspace = isWorkspace(pathname);
  const collapsed = workspace ? !workspaceOpen : userCollapsed;

  useEffect(() => {
    setOpen(false);
    setWorkspaceOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const toggle = () => (workspace ? setWorkspaceOpen((v) => !v) : toggleSidebar());

  // Ctrl+B (Cmd+B) folds and unfolds the menu, as in many editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const link = (item: Item, count?: number) => (
    <Link
      key={item.to}
      to={item.to}
      className={`nav-link ${isActive(pathname, item) ? 'active' : ''}`}
      title={collapsed ? item.label + (count ? ` (${count})` : '') : undefined}
      aria-current={isActive(pathname, item) ? 'page' : undefined}
    >
      <item.icon aria-hidden />
      <span className="nav-text">{item.label}</span>
      {!!count && <span className="nav-count" aria-label={`${count} ta`}>{count}</span>}
    </Link>
  );

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <a href="#main" className="skip-link">
        Asosiy qismga o'tish
      </a>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Asosiy menyu">
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-btn sidebar-toggle"
            onClick={toggle}
            aria-label={collapsed ? 'Menyuni ochish (Ctrl+B)' : "Menyuni yig'ish (Ctrl+B)"}
            title={collapsed ? 'Menyuni ochish (Ctrl+B)' : "Menyuni yig'ish (Ctrl+B)"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          </button>
        </div>
        <nav className="stack" style={{ gap: 4 }} aria-label="Bo'limlar">
          {LEARN.map((i) => link(i))}
          <div className="nav-label">Mashq</div>
          {PRACTICE.map((i) => link(i, i.to === '/takrorlash' ? due.length : 0))}
          <div className="nav-label">Ma'lumot</div>
          {REFERENCE.map((i) => link(i))}
        </nav>

        <div className="sidebar-foot stack">
          <Link to="/" className="today-card" title={`Bugungi maqsad: ${today.minutes} / ${today.goal} daq · ${today.streak} kun ketma-ket`}>
            <Ring value={today.ratio} size={42}>
              <Flame size={16} aria-hidden style={{ color: today.streak ? 'var(--warn)' : 'var(--text-3)' }} />
            </Ring>
            <div className="nav-text">
              <strong>{today.streak} kun ketma-ket</strong>
              <span>
                Bugun {today.minutes} / {today.goal} daq
              </span>
            </div>
          </Link>
          {auth.status !== 'disabled' &&
            link({
              to: '/akkaunt',
              label: auth.user ? auth.user.name || auth.user.email : 'Kirish',
              icon: auth.user ? (auth.sync === 'error' ? CloudOff : Cloud) : LogIn,
              also: ['/admin'],
            })}
          {link({ to: '/sozlamalar', label: 'Sozlamalar', icon: Settings })}
        </div>
      </aside>

      <div className="main">
        <div className="mobile-bar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Menyuni ochish">
            <Menu aria-hidden />
          </button>
          <Brand />
        </div>
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="page">
      <div className="lesson-skeleton" aria-busy="true" aria-label="Yuklanmoqda">
        <i style={{ width: '38%', height: 30 }} />
        <i style={{ width: '70%' }} />
        <i style={{ height: 120, marginTop: 16 }} />
      </div>
    </div>
  );
}
