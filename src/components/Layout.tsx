import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BookA,
  Flame,
  Home,
  Layers,
  Map,
  Menu,
  MessagesSquare,
  NotebookPen,
  Settings,
  ShieldCheck,
  SquareTerminal,
} from 'lucide-react';
import { useDueCards, useToday } from '../hooks/useLearning';
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

export function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const due = useDueCards();
  const today = useToday();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const link = (item: Item, count?: number) => (
    <Link key={item.to} to={item.to} className={`nav-link ${isActive(pathname, item) ? 'active' : ''}`}>
      <item.icon />
      {item.label}
      {!!count && <span className="nav-count">{count}</span>}
    </Link>
  );

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        {LEARN.map((i) => link(i))}
        <div className="nav-label">Mashq</div>
        {PRACTICE.map((i) => link(i, i.to === '/takrorlash' ? due.length : 0))}
        <div className="nav-label">Ma'lumot</div>
        {REFERENCE.map((i) => link(i))}

        <div className="sidebar-foot stack">
          <Link to="/" className="today-card" title="Bugungi maqsad">
            <Ring value={today.ratio} size={42}>
              <Flame size={16} style={{ color: today.streak ? 'var(--warn)' : 'var(--text-3)' }} />
            </Ring>
            <div>
              <strong>{today.streak} kun ketma-ket</strong>
              <span>
                Bugun {today.minutes} / {today.goal} daq
              </span>
            </div>
          </Link>
          {link({ to: '/sozlamalar', label: 'Sozlamalar', icon: Settings })}
        </div>
      </aside>

      <div className="main">
        <div className="mobile-bar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Menyu">
            <Menu />
          </button>
          <Brand />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
