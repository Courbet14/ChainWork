import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminPageHeader } from '../components/AdminPageHeader';

type Team = { id: string; name: string };
type Participant = { id: string; name: string; email: string; team_id: string | null };

export const TeamBuilder = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    if (!hackathonId) return;
    const [teamsRes, partsRes] = await Promise.all([
      supabase.from('teams').select('*').eq('hackathon_id', hackathonId).order('created_at'),
      supabase.from('participants').select('*').eq('hackathon_id', hackathonId).order('created_at')
    ]);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (partsRes.data) setParticipants(partsRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [hackathonId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !hackathonId) return;
    await supabase.from('teams').insert([{ hackathon_id: hackathonId, name: newTeamName.trim() }]);
    setNewTeamName('');
    fetchData();
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('このチームを削除しますか？所属メンバーは未所属に戻ります。')) return;
    await supabase.from('teams').delete().eq('id', id);
    fetchData();
  };

  const handleChangeTeam = async (participantId: string, teamId: string | null) => {
    await supabase.from('participants').update({ team_id: teamId }).eq('id', participantId);
    fetchData();
  };

  const handleRandomAssign = async () => {
    if (teams.length === 0) return alert('先にチームを1つ以上作成してください。');
    const unassigned = participants.filter(p => !p.team_id);
    if (unassigned.length === 0) return alert('未所属の参加者がいません。');

    setIsProcessing(true);
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    const updates = shuffled.map((p, index) => {
      const assignedTeam = teams[index % teams.length];
      return supabase.from('participants').update({ team_id: assignedTeam.id }).eq('id', p.id);
    });

    await Promise.all(updates);
    await fetchData();
    setIsProcessing(false);
  };

  if (!hackathonId) return <div className="p-8 text-white">エラー：ハッカソンIDがありません</div>;

  const unassignedParticipants = participants.filter(p => !p.team_id);

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <AdminPageHeader title="チーム自動編成" hackathonId={hackathonId} showBackButton={true} />
          <button 
            onClick={handleRandomAssign} disabled={isProcessing || teams.length === 0 || unassignedParticipants.length === 0}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all h-fit"
          >
            未所属をランダムに振り分ける
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <form onSubmit={handleCreateTeam} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">新規チーム作成</label>
              <div className="flex gap-2">
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="チーム名を入力" className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold">+</button>
              </div>
            </form>

            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md flex flex-col h-[600px]">
              <div className="p-3 border-b border-slate-800 bg-slate-800/50 rounded-t-xl">
                <h3 className="font-bold text-slate-300 text-sm">未所属の参加者 ({unassignedParticipants.length}名)</h3>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {unassignedParticipants.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">全員がチームに所属しています</p>
                ) : (
                  unassignedParticipants.map(p => (
                    <div key={p.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <p className="font-bold text-sm text-white truncate">{p.name}</p>
                      <select onChange={(e) => handleChangeTeam(p.id, e.target.value)} value="" className="mt-2 w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1">
                        <option value="" disabled>チームに割り当てる...</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
            {teams.length === 0 ? (
              <div className="col-span-full text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl">まずは左のメニューからチームを作成してください。</div>
            ) : (
              teams.map(team => {
                const members = participants.filter(p => p.team_id === team.id);
                return (
                  <div key={team.id} className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg flex flex-col max-h-[600px]">
                    <div className="p-3 border-b border-slate-800 bg-slate-800/50 rounded-t-xl flex justify-between items-center">
                      <h3 className="font-bold text-blue-400 truncate">{team.name} <span className="text-slate-400 text-xs ml-1">({members.length}名)</span></h3>
                      <button onClick={() => handleDeleteTeam(team.id)} className="text-slate-500 hover:text-red-400 text-xs">削除</button>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-2">
                      {members.map(member => (
                        <div key={member.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center group">
                          <span className="text-sm font-bold text-slate-200 truncate pr-2">{member.name}</span>
                          <button onClick={() => handleChangeTeam(member.id, null)} className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-red-950/30 px-2 py-1 rounded">外す</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};