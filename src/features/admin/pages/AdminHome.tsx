import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { AdminRoomStatsModal } from '../components/AdminRoomStatsModal';
import { AdminPageHeader } from '../components/AdminPageHeader';

export const AdminHome = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [hackathonName, setHackathonName] = useState<string>('読み込み中...');
  const [guideRoomId, setGuideRoomId] = useState<string | null>(null);
  const [guideRoomPassword, setGuideRoomPassword] = useState<string | null>(null);
  const [teams, setTeams] = useState<{id: string, name: string, room_id: string}[]>([]);
  const [copied, setCopied] = useState(false);
  const [isCreatingGuide, setIsCreatingGuide] = useState(false);
  const [selectedRoomIdToAnalyze, setSelectedRoomIdToAnalyze] = useState<string>('');
  const [statsTargetRoom, setStatsTargetRoom] = useState<{ id: string; name: string } | null>(null);

  const registrationUrl = `${window.location.origin}/register/${hackathonId}`;

  const fetchHackathonDetails = async () => {
    if (!hackathonId) return;
    const { data: hData } = await supabase.from('hackathons').select('name, guide_room_id, guide_room_password').eq('id', hackathonId).single();
    if (hData) {
      setHackathonName(hData.name);
      setGuideRoomId(hData.guide_room_id);
      setGuideRoomPassword(hData.guide_room_password);
    } else {
      setHackathonName('不明なハッカソン');
    }

    const { data: tData } = await supabase.from('teams').select('id, name, room_id').eq('hackathon_id', hackathonId).not('room_id', 'is', null);
    if (tData) setTeams(tData);
  };

  useEffect(() => {
    fetchHackathonDetails();
  }, [hackathonId]);

  const roomOptions = useMemo(() => {
    const options = [];
    if (guideRoomId) options.push({ id: guideRoomId, name: '参加手順ルーム (全体)' });
    teams.forEach(t => options.push({ id: t.room_id, name: `チーム: ${t.name}` }));
    return options;
  }, [guideRoomId, teams]);

  useEffect(() => {
    if (roomOptions.length > 0 && !selectedRoomIdToAnalyze) {
      setSelectedRoomIdToAnalyze(roomOptions[0].id);
    }
  }, [roomOptions, selectedRoomIdToAnalyze]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateGuideRoom = async () => {
    if (!hackathonId) return;
    setIsCreatingGuide(true);
    const targetRoomId = `${hackathonId}-guide`;
    const randomPassword = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      const { error: roomError } = await supabase.from('rooms').insert([{ id: targetRoomId, name: `参加手順・アナウンスルーム`, edit_password: randomPassword }]);
      if (roomError && roomError.code !== '23505') throw roomError;

      const { error: hackathonError } = await supabase.from('hackathons').update({ guide_room_id: targetRoomId, guide_room_password: randomPassword }).eq('id', hackathonId);
      if (hackathonError) throw hackathonError;

      await fetchHackathonDetails();
    } catch (err) {
      alert('ルームの作成に失敗しました。');
    } finally {
      setIsCreatingGuide(false);
    }
  };

  const handleOpenStats = () => {
    const target = roomOptions.find(o => o.id === selectedRoomIdToAnalyze);
    if (target) setStatsTargetRoom({ id: target.id, name: target.name });
  };

  if (!hackathonId) return <div className="p-8 text-white">ハッカソンIDが指定されていません。</div>;

  const adminLinks = [
    { path: 'dashboard', title: '参加者ダッシュボード', desc: '参加者一覧、アンケート回答の確認、CSVエクスポートを行います。' },
    { path: 'survey', title: 'アンケート設問設定', desc: '参加登録時に回答してもらう質問項目を動的に作成・管理します。' },
    { path: 'teams', title: 'チーム編成', desc: '手動振り分け、および未所属メンバーのランダム均等一括編成を行います。' },
    { path: 'workspaces', title: 'ルーム自動生成', desc: '各チーム専用の作業ルームを一括構築し、パスワードを割り当てます。' },
    { path: 'notify', title: '告知・個別メール', desc: '参加者ID、所属チーム名、専用ルームURLを差し込んだメールを生成します。' },
    { path: 'statistics', title: '進捗アナリティクス', desc: '各チームのタスク消化状況やクリティカルパスの危険度をリアルタイムに俯瞰します。' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-8">
        <AdminPageHeader title="ChainWork Admin" hackathonId={hackathonId} hackathonName={hackathonName} showBackButton={false} />

        <div className="bg-gradient-to-r from-slate-900 to-blue-950/40 border border-blue-900/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">全体共有：参加手順ルーム</h2>
            <p className="text-sm text-slate-400">全参加者が共通して閲覧する、レギュレーションや開発の手順を示すワークスペースです。</p>
            {guideRoomId && (
              <div className="text-xs font-mono text-slate-500 pt-2 flex gap-4">
                <span>ルームID: <span className="text-blue-400">{guideRoomId}</span></span>
                <span>パスワード: <span className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{guideRoomPassword}</span></span>
              </div>
            )}
          </div>
          <div>
            {guideRoomId ? (
              <a href={`/workspace/${guideRoomId}`} target="_blank" rel="noopener noreferrer" className="inline-block w-full md:w-auto text-center bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all whitespace-nowrap">
                手順ルームを開く
              </a>
            ) : (
              <button onClick={handleCreateGuideRoom} disabled={isCreatingGuide} className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl border border-slate-700 shadow-md transition-all whitespace-nowrap disabled:opacity-50">
                {isCreatingGuide ? '構築中...' : '参加手順ルームを自動作成'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />リアルタイム進捗分析
            </h2>
            <p className="text-sm text-slate-400">生成済みの各ルームのタスク消化率やボトルネックを瞬時に確認します。</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {roomOptions.length > 0 ? (
              <>
                <select value={selectedRoomIdToAnalyze} onChange={(e) => setSelectedRoomIdToAnalyze(e.target.value)} className="w-full sm:w-64 bg-slate-950 border border-slate-700 text-slate-300 text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                  {roomOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
                <button onClick={handleOpenStats} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all whitespace-nowrap flex items-center justify-center gap-2">
                  統計を見る
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">集計可能なルームがありません</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">参加者招待URL</h2>
          <div className="flex items-center gap-3">
            <input type="text" readOnly value={registrationUrl} className="flex-1 bg-slate-950 border border-slate-700 text-slate-300 font-mono text-sm rounded-xl px-4 py-3 focus:outline-none" />
            <button onClick={handleCopyUrl} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md w-36 text-center ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
              {copied ? 'コピー完了' : 'コピーする'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {adminLinks.map(link => (
            <Link key={link.path} to={`/admin/${link.path}/${hackathonId}`} className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{link.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
      <AdminRoomStatsModal isOpen={statsTargetRoom !== null} onClose={() => setStatsTargetRoom(null)} roomId={statsTargetRoom?.id || ''} roomName={statsTargetRoom?.name || ''} />
    </div>
  );
};