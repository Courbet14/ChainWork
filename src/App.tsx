import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace'; // ← インポートを追加

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* ダミーのdivを実際のWorkspaceコンポーネントに差し替え */}
        <Route path="/room/:id" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;