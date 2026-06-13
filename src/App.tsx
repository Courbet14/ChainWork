import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { ShareClone } from './pages/ShareClone';
import { Registration } from './pages/Registration';
import { SurveyBuilder } from './pages/SurveyBuilder';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminHome } from './pages/AdminHome';
import { TeamBuilder } from './pages/TeamBuilder';
import { AdminNotify } from './pages/AdminNotify';
import { AdminRoomGenerator } from './pages/AdminRoomGenerator';
import { AdminCreateHackathon } from './pages/AdminCreateHackathon';
import { AdminStatistics } from './pages/AdminStatistics';
function App() {
  // アプリケーション起動時の匿名セッション初期化
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
    };
    initAuth();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clone/:id" element={<ShareClone />} />
        <Route path="/clone" element={<Navigate to="/" replace />} />
        <Route path="/workspace/:id" element={<Workspace />} />
        <Route path="/workspace/:id/share" element={<ShareClone />} />
        <Route path="/register/:hackathonId" element={<Registration />} />
        <Route path="/admin/survey/:hackathonId" element={<SurveyBuilder />} />
        <Route path="/admin/dashboard/:hackathonId" element={<AdminDashboard />} />
        <Route path="/admin/home/:hackathonId" element={<AdminHome />} />
        <Route path="/admin/teams/:hackathonId" element={<TeamBuilder />} />
        <Route path="/admin/notify/:hackathonId" element={<AdminNotify />} />
        <Route path="/admin/workspaces/:hackathonId" element={<AdminRoomGenerator />} />
        <Route path="/admin/create-hackathon" element={<AdminCreateHackathon />} />
        <Route path="/admin/statistics/:hackathonId" element={<AdminStatistics />} />
      </Routes>
    </Router>
  );
}

export default App;