import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminPageHeader } from '../components/AdminPageHeader';

type Participant = { id: string; name: string; email: string; team_id: string | null };
type NotifyTeam = { id: string; name: string; workspace_id: string | null; workspace_password: string | null; };

export const AdminNotify = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<NotifyTeam[]>([]);
  const [eventDate, setEventDate] = useState('2026年6月20日(土) 10:00〜19:00');
  const [eventLocation, setEventLocation] = useState('近畿大学 Eキャンパス ○○教室');
  const [extraMessage, setExtraMessage] = useState('当日はPCと充電器を忘れずにお持ちください。');

  useEffect(() => {
    const fetchData = async () => {
      if (!hackathonId) return;
      const [pRes, tRes] = await Promise.all([
        supabase.from('participants').select('*').eq('hackathon_id', hackathonId),
        supabase.from('teams').select('*').eq('hackathon_id', hackathonId)
      ]);
      if (pRes.data) setParticipants(pRes.data);
      if (tRes.data) setTeams(tRes.data as NotifyTeam[]);
    };
    fetchData();
  }, [hackathonId]);

  const generateMailtoLink = (p: Participant) => {
    const myTeam = p.team_id ? teams.find(t => t.id === p.team_id) : null;
    const teamName = myTeam ? myTeam.name : '未定';
    const workspaceUrl = myTeam?.workspace_id ? `${window.location.origin}/workspace/${myTeam.workspace_id}` : 'チーム確定後に発行されます';
    const workspacePassword = myTeam?.workspace_password ? myTeam.workspace_password : '----';

    const subject = `【重要】ハッカソン参加に関するご案内（ID: ${p.id.substring(0, 8)}...）`;
    const body = `${p.name} 様\n\nハッカソンへのご参加ありがとうございます。\n当日のチーム編成および専用ワークスペースの準備が完了いたしましたのでご連絡いたします。\n\n━━━━━━━━━━━━━━━━━━━━\n■ あなたの参加情報\n・参加者ID : ${p.id}\n・所属チーム : ${teamName}\n\n■ チーム専用ワークスペース (ChainWork)\n・ルームURL : ${workspaceUrl}\n・アクセスパスワード : ${workspacePassword}\n※開発中のタスク管理や進捗共有には上記ルームを使用してください。\n\n■ 開催概要\n・日時 : ${eventDate}\n・場所 : ${eventLocation}\n━━━━━━━━━━━━━━━━━━━━\n\n${extraMessage}\n\n当日お会いできるのを楽しみにしています。\n運営チームより`;
    return `mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!hackathonId) return <div className="p-8 text-white">エラー：ハッカソンIDがありません</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminPageHeader title="個別告知・メール送信" hackathonId={hackathonId} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-md h-fit">
            <h3 className="font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">共通メッセージ設定</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">日時</label>
              <input type="text" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">場所</label>
              <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">追加メッセージ</label>
              <textarea value={extraMessage} onChange={e => setExtraMessage(e.target.value)} rows={4} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500" />
            </div>
            <p className="text-xs text-slate-500 mt-2">※ここで設定した内容は、右側の各参加者のメール本文に反映されます。</p>
          </div>

          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800">
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">参加者</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">チーム</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase text-right">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {participants.map(p => {
                  const team = teams.find(t => t.id === p.team_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {team ? <span className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-2 py-1 rounded text-xs">{team.name}</span> : <span className="text-slate-500 text-xs">未所属</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href={generateMailtoLink(p)} className="inline-block bg-slate-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">
                          メール作成
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {participants.length === 0 && <div className="p-8 text-center text-slate-500">参加者がいません。</div>}
          </div>
        </div>
      </div>
    </div>
  );
};