import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { ShareClone } from './pages/ShareClone';

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
      </Routes>
    </Router>
  );
}

export default App;