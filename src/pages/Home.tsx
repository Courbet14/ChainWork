import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateRoomForm } from '../components/CreateRoomForm';
import { useRoom } from '../hooks/useRoom';
import { supabase } from '../lib/supabase';

type RoomHistory = {
  id: string;
  name: string;
  accessedAt: number;
};

export const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputRoomId, setInputRoomId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [roomHistory, setRoomHistory] = useState<RoomHistory[]>([]);

  const { cloneWholeRoom, isLoading: isCloning } = useRoom(undefined);

  const isCloneRoute = window.location.pathname === '/clone';
  const targetIdParam = searchParams.get('id');
  const isReallyCloning = isCloneRoute && targetIdParam && targetIdParam.trim() !== '' && targetIdParam !== 'null' && targetIdParam !== 'undefined';

  useEffect(() => {
    const historyRaw = localStorage.getItem('chainwork_room_history');
    if (historyRaw) {
      setRoomHistory(JSON.parse(historyRaw));
    }

    if (isReallyCloning && targetIdParam) {
      handleMagicClone(targetIdParam.trim());
    }
  }, [isReallyCloning, targetIdParam]);

  const handleMagicClone = async (sourceId: string) => {
    setIsSearching(true);
    const studentNewRoomId = `board-${Math.random().toString(36).substring(2, 7)}`;
    
    const success = await cloneWholeRoom(sourceId, studentNewRoomId);
    setIsSearching(false);

    if (success) {
      navigate(`/workspace/${studentNewRoomId}`);
    } else {
      alert(`複製に失敗しました。対象ルームが存在しないか、制限されています。`);
      navigate('/');
    }
  };

  const handleDirectClone = async (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このルームを複製して、新しいワークスペースを作成しますか？')) return;

    const studentNewRoomId = `board-${Math.random().toString(36).substring(2, 7)}`;
    const success = await cloneWholeRoom(sourceId, studentNewRoomId);
    if (success) {
      navigate(`/workspace/${studentNewRoomId}`);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    setIsSearching(true);

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', inputRoomId.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        navigate(`/workspace/${data.id}`);
      } else {
        alert(`ルーム「${inputRoomId}」が見つかりません。`);
      }
    } catch (err) {
      console.error(err);
      alert('検索中にエラーが発生しました。');
    } finally {
      setIsSearching(false);
    }
  };

  const showOverlay = !!(isReallyCloning && (isSearching || isCloning));

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-gray-800">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          ChainWork
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          プロジェクトタスクの依存関係をリアルタイムに視覚化・管理
        </p>
      </div>

      <div className="mt-4 sm:mx-auto w-full max-w-4xl px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6 h-full flex flex-col justify-between">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">既存のルームに参加</h3>
            <form onSubmit={handleJoinRoom} className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="ルームIDを入力"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-600 bg-gray-50/50"
                required
              />
              <button type="submit" disabled={showOverlay} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm shadow-md transition-all">
                チェックイン
              </button>
            </form>
          </div>

          {roomHistory.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl shadow-md border border-gray-200/60 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                最近使用したルーム
              </h4>
              <div className="flex flex-col gap-2">
                {roomHistory.map((historyRoom) => (
                  <div
                    key={historyRoom.id}
                    onClick={() => navigate(`/workspace/${historyRoom.id}`)}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50/30 rounded-xl border border-gray-100 hover:border-blue-200 text-left transition-all group shadow-xs cursor-pointer"
                  >
                    <div className="truncate pr-4 flex-1">
                      <p className="text-sm font-bold text-gray-700 group-hover:text-blue-600 truncate">{historyRoom.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {historyRoom.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDirectClone(historyRoom.id, e)}
                      className="mr-3 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-100 flex items-center gap-1 shadow-xs"
                    >
                      複製
                    </button>
                    <span className="text-gray-300 group-hover:text-blue-500 font-bold text-sm transition-colors mr-1">&rarr;</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="h-full">
          <CreateRoomForm />
        </div>
      </div>

      {showOverlay && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md text-white text-center p-6">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-xl font-black tracking-wide">テンプレートを複製中...</h3>
          <p className="text-xs text-slate-300 max-w-xs mt-2 leading-relaxed">
            ワークスペースを展開しています。しばらくお待ちください。
          </p>
        </div>
      )}
    </div>
  );
};