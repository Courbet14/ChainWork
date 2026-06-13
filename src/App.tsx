import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import { Home } from './features/home/pages/Home';
import { ShareClone } from './features/share/pages/ShareClone';
import { Workspace } from './features/workspace/pages/Workspace';
import { Registration } from './features/registration/pages/Registration';
import { AdminCreateHackathon } from './features/admin/pages/AdminCreateHackathon';
import { AdminHome } from './features/admin/pages/AdminHome';
import { AdminDashboard } from './features/admin/pages/AdminDashboard';
import { AdminStatistics } from './features/admin/pages/AdminStatistics';
import { AdminNotify } from './features/admin/pages/AdminNotify';
import { AdminRoomGenerator } from './features/admin/pages/AdminRoomGenerator';
import { SurveyBuilder } from './features/admin/pages/SurveyBuilder';
import { TeamBuilder } from './features/admin/pages/TeamBuilder';

export default function App() {
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();
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
        
        <Route path="/admin/create-hackathon" element={<AdminCreateHackathon />} />
        <Route path="/admin/home/:hackathonId" element={<AdminHome />} />
        <Route path="/admin/dashboard/:hackathonId" element={<AdminDashboard />} />
        <Route path="/admin/survey/:hackathonId" element={<SurveyBuilder />} />
        <Route path="/admin/teams/:hackathonId" element={<TeamBuilder />} />
        <Route path="/admin/workspaces/:hackathonId" element={<AdminRoomGenerator />} />
        <Route path="/admin/notify/:hackathonId" element={<AdminNotify />} />
        <Route path="/admin/statistics/:hackathonId" element={<AdminStatistics />} />
      </Routes>
    </Router>
  );
}