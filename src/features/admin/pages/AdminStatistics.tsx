import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminRoomStatsModal } from '../components/AdminRoomStatsModal';
import { AdminPageHeader } from '../components/AdminPageHeader';

export const AdminStatistics = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [hackathonName, setHackathonName] = useState<string>('読み込み中...');
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoomIdToAnalyze, setSelectedRoomIdToAnalyze] = useState<string>('');
  const [statsTargetRoom, setStatsTargetRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!hackathonId) return;
      const { data: hData } = await supabase.from('hackathons').select('name').eq('id', hackathonId).single();
      if (hData) setHackathonName(hData.name);

      const { data: roomsData, error } = await supabase.from('rooms').select('id, name').like('id', `${hackathonId}-%`);
      if (error) {
        console.error('ルーム一覧の取得エラー:', error);
        return;
      }
      if (roomsData) {
        setRooms(roomsData);
        if (roomsData.length > 0) setSelectedRoomIdToAnalyze(roomsData[0].id);
      }
    };
    fetchData();
  }, [hackathonId]);

  const handleOpenStats = () => {
    const target = rooms.find(r => r.id === selectedRoomIdToAnalyze);
    if (target) setStatsTargetRoom({ id: target.id, name: target.name });
  };

  if (!hackathonId) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-4xl mx-auto space-y-8">
        <AdminPageHeader title="進捗アナリティクス" hackathonId={hackathonId} hackathonName={hackathonName} />

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">分析対象のルームを選択</h2>
            <p className="text-sm text-slate-400">ハッカソン内の各ワークスペースのタスク消化率、ボトルネック、クリティカルパスを確認します。</p>
          </div>

          {rooms.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <select value={selectedRoomIdToAnalyze} onChange={(e) => setSelectedRoomIdToAnalyze(e.target.value)} className="w-full sm:flex-1 bg-slate-950 border border-slate-700 text-white text-lg font-bold rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500">
                {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
              <button onClick={handleOpenStats} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                分析を開始する
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center">
              <span className="text-slate-500 font-bold">集計可能なルームがまだ生成されていません。</span>
            </div>
          )}
        </div>
      </div>

      <AdminRoomStatsModal isOpen={statsTargetRoom !== null} onClose={() => setStatsTargetRoom(null)} roomId={statsTargetRoom?.id || ''} roomName={statsTargetRoom?.name || ''} />
    </div>
  );
};