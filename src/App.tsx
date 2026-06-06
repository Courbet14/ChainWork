import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';

function App() {
  return (
    <Router>
      <Routes>
        {/* 💡 トップ画面 (ルーム作成・入室フォーム) */}
        <Route path="/" element={<Home />} />
        
        {/* 💡 ワークスペース画面 (末尾の :id で動的なルームIDをキャッチ) */}
        <Route path="/workspace/:id" element={<Workspace />} />
      </Routes>
    </Router>
  );
}

export default App;