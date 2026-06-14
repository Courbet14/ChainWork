import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminRoomStatsCard } from '../components/AdminRoomStatsCard';

export const AdminStatistics = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [hackathonName, setHackathonName] = useState<string>('読み込み中...');
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!hackathonId) return;
      
      const { data: hData } = await supabase.from('hackathons').select('name').eq('id', hackathonId).single();
      if (hData) setHackathonName(hData.name);

      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('id, name')
        .like('id', `${hackathonId}-%`)
        .neq('id', `${hackathonId}-guide`);//ガイドページは除外

      if (error) {
        console.error('ルーム一覧の取得エラー:', error);
        return;
      }
      if (roomsData) setRooms(roomsData);
    };
    fetchData();
  }, [hackathonId]);
  if (!hackathonId) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <AdminPageHeader title="進捗アナリティクス" hackathonId={hackathonId} hackathonName={hackathonName} />

        <div className="space-y-2 mb-8 border-b border-slate-800 pb-6">
          <h2 className="text-lg font-bold text-white">全チームの進捗ボード</h2>
          <p className="text-sm text-slate-400">下にスクロールして、各ワークスペースのタスク消化率やボトルネックをリアルタイムに比較・確認できます。</p>
        </div>

        {rooms.length > 0 ? (
          <div className="space-y-12">
            {rooms.map(room => (
              <AdminRoomStatsCard key={room.id} roomId={room.id} roomName={room.name} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-lg">
            <span className="text-slate-500 font-bold">集計可能なルーム（ワークスペース）がまだ生成されていません。</span>
          </div>
        )}
      </div>
    </div>
  );
};