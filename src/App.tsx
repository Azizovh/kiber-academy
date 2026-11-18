import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { StagePage } from './pages/StagePage';
import { useSettings } from './store/settings';

// Pages that are not the first screen load as separate chunks; Layout shows a placeholder meanwhile.
// After a new deploy an open tab may ask for chunk names that no longer exist: reload once to get the new build.
const RELOAD_KEY = 'kiberakademiya:chunk-reload';
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() =>
    load().then(
      (m) => {
        try {
          sessionStorage.removeItem(RELOAD_KEY);
        } catch {
          /* storage blocked */
        }
        return { default: m[name] };
      },
      (err: unknown) => {
        let reloaded = true;
        try {
          reloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
          if (!reloaded) sessionStorage.setItem(RELOAD_KEY, '1');
        } catch {
          /* storage blocked: do not risk a reload loop */
        }
        if (!reloaded) window.location.reload();
        throw err;
      },
    ),
  );
const AccountPage = page(() => import('./pages/AccountPage'), 'AccountPage');
const AdminPage = page(() => import('./pages/AdminPage'), 'AdminPage');
const CtfPage = page(() => import('./pages/CtfPage'), 'CtfPage');
const GlossaryPage = page(() => import('./pages/GlossaryPage'), 'GlossaryPage');
const InterviewPage = page(() => import('./pages/InterviewPage'), 'InterviewPage');
const LabPage = page(() => import('./pages/LabPage'), 'LabPage');
const NotesPage = page(() => import('./pages/NotesPage'), 'NotesPage');
const PracticePage = page(() => import('./pages/PracticePage'), 'PracticePage');
const ReviewPage = page(() => import('./pages/ReviewPage'), 'ReviewPage');
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage');
const TopicPage = page(() => import('./pages/TopicPage'), 'TopicPage');

function useTheme(): void {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

export function App() {
  useTheme();
  const onboarded = useSettings((s) => s.onboarded);

  if (!onboarded) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="xarita" element={<RoadmapPage />} />
        <Route path="bosqich/:stageId" element={<StagePage />} />
        <Route path="mavzu/:topicId" element={<TopicPage />} />
        <Route path="amaliyot" element={<PracticePage />} />
        <Route path="lab/:labId" element={<LabPage />} />
        <Route path="ctf/:ctfId" element={<CtfPage />} />
        <Route path="takrorlash" element={<ReviewPage />} />
        <Route path="lugat" element={<GlossaryPage />} />
        <Route path="qaydlar" element={<NotesPage />} />
        <Route path="intervyu" element={<InterviewPage />} />
        <Route path="sozlamalar" element={<SettingsPage />} />
        <Route path="akkaunt" element={<AccountPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
