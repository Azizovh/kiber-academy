import { useRef, useState } from 'react';
import { Download, Monitor, Moon, Sun, Trash2, Upload } from 'lucide-react';
import { SPECIALITIES, getTrack } from '../content/curriculum';
import { downloadBackup, resetLearningData, restoreBackup } from '../store/backup';
import { DAILY_OPTIONS, WEEK_OPTIONS, useSettings, type ThemeChoice } from '../store/settings';
import { APP_VERSION } from '../version';
import { PaceEstimate, dailyLabel } from './OnboardingPage';

const THEMES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: 'dark', label: "Qorong'i", icon: Moon },
  { id: 'light', label: "Yorug'", icon: Sun },
  { id: 'system', label: 'Tizimga mos', icon: Monitor },
];

export function SettingsPage() {
  const settings = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      restoreBackup(await file.text());
      notify('Zaxira nusxa tiklandi');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Faylni tiklab bo\'lmadi');
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const onReset = () => {
    const ok = window.confirm(
      "Barcha progress, faollik tarixi, kartochkalar va qaydlar o'chiriladi. Buni qaytarib bo'lmaydi.\n\nDavom etilsinmi?",
    );
    if (!ok) return;
    resetLearningData();
    notify("O'quv ma'lumotlari tozalandi");
  };

  return (
    <div className="page narrow">
      <header className="page-head" style={{ marginBottom: 8 }}>
        <h1 className="page-title">Sozlamalar</h1>
      </header>

      <section className="settings-block" style={{ borderTop: 0 }}>
        <div>
          <h2>Profil</h2>
          <p>Faqat shu kompyuterda saqlanadi.</p>
        </div>
        <div className="field">
          <label htmlFor="name">Ism</label>
          <input
            id="name"
            className="input"
            value={settings.name}
            onChange={(e) => settings.set({ name: e.target.value })}
            maxLength={40}
          />
        </div>
      </section>

      <section className="settings-block">
        <div>
          <h2>O'qish sur'ati</h2>
          <p>Kunlik maqsad va barcha taxminiy sanalar shundan hisoblanadi.</p>
        </div>
        <div className="stack" style={{ gap: 18 }}>
          <div className="field">
            <label>Kuniga</label>
            <div className="seg">
              {DAILY_OPTIONS.map((m) => (
                <button key={m} className={m === settings.dailyMinutes ? 'on' : ''} onClick={() => settings.set({ dailyMinutes: m })}>
                  {dailyLabel(m)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Haftada</label>
            <div className="seg">
              {WEEK_OPTIONS.map((d) => (
                <button key={d} className={d === settings.daysPerWeek ? 'on' : ''} onClick={() => settings.set({ daysPerWeek: d })}>
                  {d} kun
                </button>
              ))}
            </div>
          </div>
          <PaceEstimate dailyMinutes={settings.dailyMinutes} daysPerWeek={settings.daysPerWeek} />
          <p className="small faint">Yuqoridagi muddatlar — noldan boshlagan holat uchun. Sizning shaxsiy rejangiz bosh sahifada.</p>
        </div>
      </section>

      <section className="settings-block">
        <div>
          <h2>Yo'nalish</h2>
          <p>Poydevordan keyin o'rganadigan mutaxassisligingiz.</p>
        </div>
        <div className="seg">
          <button className={settings.speciality === null ? 'on' : ''} onClick={() => settings.set({ speciality: null })}>
            Hali tanlamadim
          </button>
          {SPECIALITIES.map((id) => (
            <button key={id} className={settings.speciality === id ? 'on' : ''} onClick={() => settings.set({ speciality: id })}>
              {getTrack(id).title}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <div>
          <h2>Ko'rinish</h2>
        </div>
        <div className="seg">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button key={id} className={settings.theme === id ? 'on' : ''} onClick={() => settings.set({ theme: id })}>
              <Icon size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <div>
          <h2>Ma'lumotlar</h2>
          <p>Progress shu kompyuterda saqlanadi. Vaqti-vaqti bilan zaxira nusxa olib turing.</p>
        </div>
        <div className="stack">
          <div className="row wrap">
            <button className="btn" onClick={downloadBackup}>
              <Download /> Zaxira nusxani yuklab olish
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              <Upload /> Fayldan tiklash
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
          </div>
          <div>
            <button className="btn danger" onClick={onReset}>
              <Trash2 /> Barcha progressni tozalash
            </button>
          </div>
        </div>
      </section>

      <section className="settings-block">
        <div>
          <h2>Dastur haqida</h2>
        </div>
        <p className="muted small">
          KiberAkademiya v{APP_VERSION}. Barcha dars va mashqlar faqat ta'lim maqsadida. O'rgangan usullaringizni
          faqat o'zingizga tegishli yoki yozma ruxsat berilgan tizimlarda qo'llang.
        </p>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
