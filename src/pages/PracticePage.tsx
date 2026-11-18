import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ExternalLink, Flag, Globe, SquareTerminal } from 'lucide-react';
import { Level } from '../components/ui';
import { CTF, CTF_CATEGORIES } from '../content/ctf';
import { LABS } from '../content/labs';
import { useProgress } from '../store/progress';

type Tab = 'lab' | 'ctf' | 'tashqi';

const EXTERNAL = [
  { title: 'TryHackMe', url: 'https://tryhackme.com/', text: "Boshlovchilar uchun eng qulay platforma: brauzerda ishlaydigan mashinalar va qadam-baqadam xonalar." },
  { title: 'OverTheWire — Bandit', url: 'https://overthewire.org/wargames/bandit/', text: "Linux terminalini o'yin orqali o'rganish. 3-bosqich bilan birga o'ting." },
  { title: 'PortSwigger Web Security Academy', url: 'https://portswigger.net/web-security', text: "Web zaifliklari bo'yicha eng yaxshi bepul nazariya va lablar." },
  { title: 'Hack The Box', url: 'https://www.hackthebox.com/', text: "Yo'riqnomasiz haqiqiy mashinalar. Poydevordan keyin boshlang." },
  { title: 'picoCTF', url: 'https://picoctf.org/', text: "Boshlovchilar uchun yil bo'yi ochiq CTF topshiriqlari." },
  { title: 'CyberDefenders', url: 'https://cyberdefenders.org/', text: 'Blue Team: log, PCAP va xotira tahlili topshiriqlari.' },
  { title: 'CryptoHack', url: 'https://cryptohack.org/', text: "Kriptografiyani topshiriqlar yechib o'rganish." },
  { title: 'CyberChef', url: 'https://gchq.github.io/CyberChef/', text: "Kodlash, dekodlash va shifrlar uchun “oshxona pichog'i”. CTF'da doim kerak." },
];

export function PracticePage() {
  const [tab, setTab] = useState<Tab>('lab');
  const labs = useProgress((s) => s.labs);
  const ctf = useProgress((s) => s.ctf);
  const labsDone = LABS.filter((l) => labs[l.id]?.done).length;
  const ctfDone = CTF.filter((c) => ctf[c.id]?.solved).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Amaliyot</h1>
          <p className="page-sub">
            Kiberxavfsizlik o'qib emas, qilib o'rganiladi. Bu yerdagi hamma narsa xavfsiz o'quv muhiti — bemalol
            tajriba qiling.
          </p>
        </div>
      </header>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'lab' ? 'active' : ''}`} onClick={() => setTab('lab')}>
          <SquareTerminal /> Terminal lablari · {labsDone}/{LABS.length}
        </button>
        <button className={`tab ${tab === 'ctf' ? 'active' : ''}`} onClick={() => setTab('ctf')}>
          <Flag /> CTF · {ctfDone}/{CTF.length}
        </button>
        <button className={`tab ${tab === 'tashqi' ? 'active' : ''}`} onClick={() => setTab('tashqi')}>
          <Globe /> Tashqi platformalar
        </button>
      </div>

      {tab === 'lab' && (
        <div className="grid c3">
          {LABS.map((lab, i) => {
            const done = labs[lab.id]?.done;
            return (
              <Link key={lab.id} to={`/lab/${lab.id}`} className={`card tile ${done ? 'solved' : ''}`}>
                <div className="row between">
                  <span className="eyebrow">Lab {i + 1}</span>
                  {done && <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} />}
                </div>
                <h2>{lab.title}</h2>
                <p>{lab.summary}</p>
                <div className="tile-foot">
                  <Level level={lab.level} />
                  <span className="chip">
                    <Clock /> {lab.minutes} daq
                  </span>
                  <span className="chip">{lab.tasks.length} topshiriq</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {tab === 'ctf' && (
        <div className="grid c3">
          {CTF.map((ch) => {
            const solved = ctf[ch.id]?.solved;
            return (
              <Link key={ch.id} to={`/ctf/${ch.id}`} className={`card tile ${solved ? 'solved' : ''}`}>
                <div className="row between">
                  <span className="eyebrow">{CTF_CATEGORIES[ch.category]}</span>
                  {solved && <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} />}
                </div>
                <h2>{ch.title}</h2>
                <p>{ch.description.split('\n')[0]}</p>
                <div className="tile-foot">
                  <Level level={ch.level} />
                  {ch.shell && (
                    <span className="chip">
                      <SquareTerminal /> terminal
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {tab === 'tashqi' && (
        <div className="grid c2">
          {EXTERNAL.map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="card tile">
              <div className="row between">
                <h2>{p.title}</h2>
                <ExternalLink size={16} className="faint" />
              </div>
              <p>{p.text}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
