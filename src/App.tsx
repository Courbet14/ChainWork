import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { ShareClone } from './pages/ShareClone'; // 💡 追加！

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clone" element={<Home />} />
        <Route path="/workspace/:id" element={<Workspace />} />
        
        {/* 💡 追加：特定のルームから共有用リンク・QRを生成する画面 */}
        <Route path="/workspace/:id/share" element={<ShareClone />} />
      </Routes>
    </Router>
  );
}

export default App;