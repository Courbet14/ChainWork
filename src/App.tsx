import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { ShareClone } from './pages/ShareClone';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* 💡 修正: 配布用URL /clone/ルームID でアクセスされた場合も ShareClone 画面で受け皿としてキャッチする */}
        <Route path="/clone/:id" element={<ShareClone />} />
        
        {/* 予備用：もし後ろにスラッシュがないクエリパラメータで来てもHomeに逃がすか統合 */}
        <Route path="/clone" element={<Navigate to="/" replace />} />
        
        <Route path="/workspace/:id" element={<Workspace />} />
        
        {/* 特定のルームから共有用リンク・QRを生成する画面 */}
        <Route path="/workspace/:id/share" element={<ShareClone />} />
      </Routes>
    </Router>
  );
}

export default App;