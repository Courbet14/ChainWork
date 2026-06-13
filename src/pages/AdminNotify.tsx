import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Participant = { id: string; name: string; email: string; team_id: string | null };

// 💡 型衝突を防ぐため、新カラムを含めた専用の型を定義
type NotifyTeam = { 
  id: string; 
  name: string; 
  workspace_id: string | null; 
  workspace_password: string | null; 
};

export const AdminNotify = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  // 💡 ステートの型を NotifyTeam[] に変更
  const [teams, setTeams] = useState<NotifyTeam[]>([]);
  
  // イベントの共通情報
  const [eventDate, setEventDate] = useState('2026年6月20日(土) 10:00〜19:00');
  const [eventLocation, setEventLocation] = useState('近畿大学 Eキャンパス ○○教室');
  const [extraMessage, setExtraMessage] = useState('当日はPCと充電器を忘れずにお持ちください！');

  useEffect(() => {
    const fetchData = async () => {
      if (!hackathonId) return;
      const [pRes, tRes] = await Promise.all([
        supabase.from('participants').select('*').eq('hackathon_id', hackathonId),
        supabase.from('teams').select('*').eq('hackathon_id', hackathonId)
      ]);
      if (pRes.data) setParticipants(pRes.data);
      // 💡 Supabaseのデータを明示的に NotifyTeam[] 型にキャストして保存
      if (tRes.data) setTeams(tRes.data as NotifyTeam[]);
    };
    fetchData();
  }, [hackathonId]);

  // 参加者ごとの個別メールリンクを生成する関数
  const generateMailtoLink = (p: Participant) => {
    // 💡 参加者のteam_idから、所属チームの情報を安全に取得
    const myTeam = p.team_id ? teams.find(t => t.id === p.team_id) : null;
    const teamName = myTeam ? myTeam.name : '未定';
    
    // 💡 チーム専用ワークスペースの情報を構築
    const workspaceUrl = myTeam && myTeam.workspace_id 
      ? `${window.location.origin}/workspace/${myTeam.workspace_id}` 
      : 'チーム確定後に発行されます';
    const workspacePassword = myTeam && myTeam.workspace_password 
      ? myTeam.workspace_password 
      : '----';

    const subject = `【重要】ハッカソン参加に関するご案内（ID: ${p.id.substring(0, 8)}...）`;
    
    // メール本文のテンプレート（ワークスペース情報付き）
    const body = `${p.name} 様

ハッカソンへのご参加ありがとうございます！
当日のチーム編成および専用ワークスペースの準備が完了いたしましたのでご連絡いたします。

━━━━━━━━━━━━━━━━━━━━
■ あなたの参加情報
・参加者ID : ${p.id}
・所属チーム : ${teamName}

■ チーム専用ワークスペース (ChainWork)
・ルームURL : ${workspaceUrl}
・アクセスパスワード : ${workspacePassword}
※開発中のタスク管理や進捗共有には上記ルームを使用してください。

■ 開催概要
・日時 : ${eventDate}
・場所 : ${eventLocation}
━━━━━━━━━━━━━━━━━━━━

${extraMessage}

当日お会いできるのを楽しみにしています！
運営チームより`;

    // URIエンコードしてmailtoリンク化
    return `mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!hackathonId) return <div className="p-8 text-white">エラー：ハッカソンIDがありません</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wider">📢 個別告知・メール送信</h2>
            <p className="text-sm text-slate-500 font-mono">ID: {hackathonId}</p>
          </div>
          <Link to={`/admin/home/${hackathonId}`} className="text-sm text-blue-400 hover:text-blue-300 underline">
            ホームに戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左側：共通テンプレート設定 */}
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
            
            <p className="text-xs text-slate-500 mt-2">
              ※ここで設定した内容は、右側の各参加者のメール本文に自動で反映されます。
            </p>
          </div>

          {/* 右側：参加者リストと送信ボタン */}
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
                        {team ? (
                          <span className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-2 py-1 rounded text-xs">{team.name}</span>
                        ) : (
                          <span className="text-slate-500 text-xs">未所属</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a 
                          href={generateMailtoLink(p)} 
                          className="inline-block bg-slate-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                          ✉️ メール作成
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {participants.length === 0 && (
              <div className="p-8 text-center text-slate-500">参加者がいません。</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};