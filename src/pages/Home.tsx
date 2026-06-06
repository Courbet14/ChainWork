import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateRoomForm } from '../components/CreateRoomForm';
import { supabase } from '../lib/supabase';

type RoomHistory = {
  id: string;
  name: string;
  accessedAt: number;
};

export const Home = () => {
  const navigate = useNavigate();
  const [inputRoomId, setInputRoomId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [roomHistory, setRoomHistory] = useState<RoomHistory[]>([]);

  // 💡 起動時にローカルストレージから過去の履歴を呼び出す
  useEffect(() => {
    const historyRaw = localStorage.getItem('chainwork_room_history');
    if (historyRaw) {
      setRoomHistory(JSON.parse(historyRaw));
    }
  }, []);

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
        alert(`❌ ルーム「${inputRoomId}」が見つかりません。`);
      }
    } catch (err) {
      console.error(err);
      alert('ルームの検索中にエラーが発生しました。');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-gray-800">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          ChainWork
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          UML風の木構造で、プロジェクトのタスクチェーンをリアルタイムに視覚化
        </p>
      </div>

      <div className="mt-4 sm:mx-auto w-full max-w-4xl px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* 🚪 左側: 入室 ＆ ★過去に使用したルーム履歴 */}
        <div className="space-y-6 h-full flex flex-col justify-between">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl shadow-xs">🚪</div>
            <h3 className="text-lg font-bold text-gray-800">既存のルームに参加する</h3>
            
            <form onSubmit={handleJoinRoom} className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="ルームIDを入力 (例: toyota-intern)"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-600 bg-gray-50/50"
                required
              />
              <button type="submit" disabled={isSearching || !inputRoomId.trim()} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm shadow-md transition-all">
                {isSearching ? 'ルームを探索中...' : 'ルームへチェックイン'}
              </button>
            </form>
          </div>

          {/* 💡 【新設】最近使ったルームの履歴お気に入りリスト */}
          {roomHistory.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl shadow-md border border-gray-200/60 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                ⏱️ 最近使用したルーム（直近5件）
              </h4>
              <div className="flex flex-col gap-2">
                {roomHistory.map((historyRoom) => (
                  <button
                    key={historyRoom.id}
                    onClick={() => navigate(`/workspace/${historyRoom.id}`)}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-blue-50/50 rounded-xl border border-gray-100 hover:border-blue-200 text-left transition-all group shadow-xs"
                  >
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold text-gray-700 group-hover:text-blue-600 truncate">{historyRoom.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {historyRoom.id}</p>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-500 font-bold text-sm transition-colors">&rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🚀 右側: 新規ルーム作成 */}
        <div className="h-full">
          <CreateRoomForm />
        </div>

      </div>

      <div className="mt-12 text-center text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
        <span className="font-bold text-gray-500">ChainWork CSR Initiative</span><br />
        24時間オートログインリース機能を搭載。企業のノノウハウへのクイックアクセスを実現します。
      </div>

    </div>
  );
};