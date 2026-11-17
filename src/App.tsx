import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CtfPage } from './pages/CtfPage';
import { DashboardPage } from './pages/DashboardPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { InterviewPage } from './pages/InterviewPage';
import { LabPage } from './pages/LabPage';
import { NotesPage } from './pages/NotesPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PracticePage } from './pages/PracticePage';
import { ReviewPage } from './pages/ReviewPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SettingsPage } from './pages/SettingsPage';
import { StagePage } from './pages/StagePage';
import { TopicPage } from './pages/TopicPage';
import { useSettings } from './store/settings';

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
