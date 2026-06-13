import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AdminRoomStatsModal } from '../components/AdminRoomStatsModal';

export const AdminStatistics = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [hackathonName, setHackathonName] = useState<string>('読み込み中...');
  
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  
  const [selectedRoomIdToAnalyze, setSelectedRoomIdToAnalyze] = useState<string>('');
  const [statsTargetRoom, setStatsTargetRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!hackathonId) return;
      
      // 1. ハッカソン情報の取得
      const { data: hData } = await supabase
        .from('hackathons')
        .select('name')
        .eq('id', hackathonId)
        .single();
        
      if (hData) {
        setHackathonName(hData.name);
      }

      // 💡 2. roomsテーブルから、IDが「hackathonId-」で始まるものを前方一致（LIKE）で全取得
      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('id, name')
        .like('id', `${hackathonId}-%`); // ← 修正ポイント：ここが前方一致検索！

      if (error) {
        console.error('ルーム一覧の取得エラー:', error);
        return;
      }

      if (roomsData) {
        // ※必要に応じて並び替え（ソート）をしたい場合は、ここで .sort() などをかけます
        setRooms(roomsData);
        
        // 初期選択を設定
        if (roomsData.length > 0) {
          setSelectedRoomIdToAnalyze(roomsData[0].id);
        }
      }
    };

    fetchData();
  }, [hackathonId]);

  const handleOpenStats = () => {
    const target = rooms.find(r => r.id === selectedRoomIdToAnalyze);
    if (target) {
      setStatsTargetRoom({ id: target.id, name: target.name });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ヘッダーと戻るボタン */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <Link 
            to={`/admin/home/${hackathonId}`} 
            className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider">📊 進捗アナリティクス</h1>
            <p className="text-sm text-slate-400 mt-1">{hackathonName} のリアルタイム分析</p>
          </div>
        </div>

        {/* チーム選択パネル */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">分析対象のルームを選択</h2>
            <p className="text-sm text-slate-400">
              ハッカソン内の各ワークスペースのタスク消化率、ボトルネックとなっているメンバー、クリティカルパスの状況を確認します。
            </p>
          </div>

          {rooms.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <select 
                value={selectedRoomIdToAnalyze}
                onChange={(e) => setSelectedRoomIdToAnalyze(e.target.value)}
                className="w-full sm:flex-1 bg-slate-950 border border-slate-700 text-white text-lg font-bold rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
              <button 
                onClick={handleOpenStats}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                分析を開始する
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center">
              <span className="text-slate-500 font-bold">集計可能なルーム（ワークスペース）がまだ生成されていません。</span>
            </div>
          )}
        </div>

      </div>

      {/* ラッパーモーダルの呼び出し */}
      <AdminRoomStatsModal
        isOpen={statsTargetRoom !== null}
        onClose={() => setStatsTargetRoom(null)}
        roomId={statsTargetRoom?.id || ''}
        roomName={statsTargetRoom?.name || ''}
      />
    </div>
  );
};