import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminPageHeader } from '../components/AdminPageHeader';

type WorkspaceTeam = { id: string; name: string; workspace_id: string | null; workspace_password: string | null; };

export const AdminRoomGenerator = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [teams, setTeams] = useState<WorkspaceTeam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTeams = async () => {
    if (!hackathonId) return;
    const { data } = await supabase.from('teams').select('*').eq('hackathon_id', hackathonId).order('created_at');
    if (data) setTeams(data as WorkspaceTeam[]);
  };

  useEffect(() => {
    fetchTeams();
  }, [hackathonId]);

  const generateRandomPassword = () => Math.floor(1000 + Math.random() * 9000).toString();

  const handleGenerateRoom = async (team: WorkspaceTeam, index: number) => {
    const roomId = `${hackathonId}-t${index + 1}`;
    const password = generateRandomPassword();

    try {
      const { error: roomError } = await supabase.from('rooms').upsert({ id: roomId, name: `${team.name} (Workspace)`, edit_password: password });
      if (roomError) throw roomError;

      await supabase.from('teams').update({ workspace_id: roomId, workspace_password: password }).eq('id', team.id);
    } catch (err) {
      alert(`${team.name}のルーム生成に失敗しました。`);
    }
  };

  const handleGenerateAll = async () => {
    setIsProcessing(true);
    const ungeneratedTeams = teams.filter(t => !t.workspace_id);
    for (let i = 0; i < ungeneratedTeams.length; i++) {
      const targetTeam = ungeneratedTeams[i];
      const actualIndex = teams.findIndex(t => t.id === targetTeam.id);
      await handleGenerateRoom(targetTeam, actualIndex);
    }
    await fetchTeams();
    setIsProcessing(false);
  };

  if (!hackathonId) return <div className="p-8 text-white">エラー：ハッカソンIDがありません</div>;

  const allGenerated = teams.length > 0 && teams.every(t => t.workspace_id);

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <AdminPageHeader title="ワークスペース自動生成" hackathonId={hackathonId} showBackButton={true} />
          <button 
            onClick={handleGenerateAll} disabled={isProcessing || teams.length === 0 || allGenerated}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all h-fit"
          >
            {isProcessing ? '生成中...' : '未作成のルームを一括生成'}
          </button>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">チーム名</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">ルームID (URL)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">パスワード</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {teams.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">チームがまだ作成されていません。</td></tr>
              ) : (
                teams.map((t, index) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-white">{t.name}</td>
                    <td className="px-6 py-4 text-sm font-mono">
                      {t.workspace_id ? <a href={`/workspace/${t.workspace_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{t.workspace_id}</a> : <span className="text-slate-600">未生成</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">
                      {t.workspace_password ? <span className="bg-slate-950 px-2 py-1 rounded text-emerald-400 border border-slate-800 select-all">{t.workspace_password}</span> : <span className="text-slate-600">----</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {t.workspace_id ? (
                        <span className="text-emerald-500 text-xs font-bold flex items-center justify-end gap-1">準備完了</span>
                      ) : (
                        <button onClick={async () => { setIsProcessing(true); await handleGenerateRoom(t, index); await fetchTeams(); setIsProcessing(false); }} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">個別生成</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};