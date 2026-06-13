import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// 💡 作成したラッパーコンポーネントをインポート
import { AdminRoomStatsModal } from '../components/AdminRoomStatsModal';

export const AdminHome = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [hackathonName, setHackathonName] = useState<string>('読み込み中...');
  const [guideRoomId, setGuideRoomId] = useState<string | null>(null);
  const [guideRoomPassword, setGuideRoomPassword] = useState<string | null>(null);
  
  // 💡 チーム一覧（ルームIDを持つもの）を保持するステート
  const [teams, setTeams] = useState<{id: string, name: string, room_id: string}[]>([]);
  
  const [copied, setCopied] = useState(false);
  const [isCreatingGuide, setIsCreatingGuide] = useState(false);

  // 💡 統計モーダル制御用のステート
  const [selectedRoomIdToAnalyze, setSelectedRoomIdToAnalyze] = useState<string>('');
  const [statsTargetRoom, setStatsTargetRoom] = useState<{ id: string; name: string } | null>(null);

  // 参加者向けの公開登録URL
  const registrationUrl = `${window.location.origin}/register/${hackathonId}`;

  const fetchHackathonDetails = async () => {
    if (!hackathonId) return;
    
    // 1. ハッカソン情報の取得
    const { data: hData, error: hError } = await supabase
      .from('hackathons')
      .select('name, guide_room_id, guide_room_password')
      .eq('id', hackathonId)
      .single();
      
    if (hData) {
      setHackathonName(hData.name);
      setGuideRoomId(hData.guide_room_id);
      setGuideRoomPassword(hData.guide_room_password);
    } else if (hError) {
      setHackathonName('不明なハッカソン');
    }

    // 💡 2. このハッカソンに紐づく「ルーム生成済み」のチーム一覧を取得
    const { data: tData } = await supabase
      .from('teams')
      .select('id, name, room_id')
      .eq('hackathon_id', hackathonId)
      .not('room_id', 'is', null);

    if (tData) {
      setTeams(tData);
    }
  };

  useEffect(() => {
    fetchHackathonDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  // 💡 分析可能なルームの選択肢を生成（ガイドルーム ＋ 各チームルーム）
  const roomOptions = useMemo(() => {
    const options = [];
    if (guideRoomId) {
      options.push({ id: guideRoomId, name: '🚨 参加手順ルーム (全体)' });
    }
    teams.forEach(t => {
      options.push({ id: t.room_id, name: `チーム: ${t.name}` });
    });
    return options;
  }, [guideRoomId, teams]);

  // 初期値の自動セット
  useEffect(() => {
    if (roomOptions.length > 0 && !selectedRoomIdToAnalyze) {
      setSelectedRoomIdToAnalyze(roomOptions[0].id);
    }
  }, [roomOptions, selectedRoomIdToAnalyze]);

  // URLコピー機能
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 参加手順ルームの自動生成処理
  const handleCreateGuideRoom = async () => {
    if (!hackathonId) return;
    setIsCreatingGuide(true);

    const targetRoomId = `${hackathonId}-guide`;
    const randomPassword = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      const { error: roomError } = await supabase.from('rooms').insert([{
        id: targetRoomId,
        name: `🚨 参加手順・アナウンスルーム`,
        edit_password: randomPassword
      }]);

      if (roomError && roomError.code !== '23505') throw roomError;

      const { error: hackathonError } = await supabase
        .from('hackathons')
        .update({
          guide_room_id: targetRoomId,
          guide_room_password: randomPassword
        })
        .eq('id', hackathonId);

      if (hackathonError) throw hackathonError;

      await fetchHackathonDetails();
    } catch (err) {
      console.error('参加手順ルームの作成に失敗しました:', err);
      alert('ルームの作成に失敗しました。');
    } finally {
      setIsCreatingGuide(false);
    }
  };

  // 💡 統計モーダルを開く
  const handleOpenStats = () => {
    const target = roomOptions.find(o => o.id === selectedRoomIdToAnalyze);
    if (target) {
      setStatsTargetRoom({ id: target.id, name: target.name });
    }
  };

  if (!hackathonId) return <div className="p-8 text-white">ハッカソンIDが指定されていません。</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ヘッダー */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-white tracking-wider mb-2">
            ChainWork <span className="text-blue-500">Admin</span>
          </h1>
          <p className="text-lg font-bold text-slate-300">{hackathonName}</p>
          <p className="text-xs text-slate-500 font-mono mt-1">ID: {hackathonId}</p>
        </div>

        {/* 参加手順ルーム（ガイドライン）管理パネル */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950/40 border border-blue-900/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📘 全体共有：参加手順ルーム
            </h2>
            <p className="text-sm text-slate-400">
              全参加者が共通して閲覧する、レギュレーションや開発の手順を示すワークスペースです。
            </p>
            {guideRoomId && (
              <div className="text-xs font-mono text-slate-500 pt-2 flex gap-4">
                <span>ルームID: <span className="text-blue-400">{guideRoomId}</span></span>
                <span>パスワード: <span className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{guideRoomPassword}</span></span>
              </div>
            )}
          </div>
          
          <div>
            {guideRoomId ? (
              <a 
                href={`/workspace/${guideRoomId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full md:w-auto text-center bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
              >
                🔗 手順ルームを開く
              </a>
            ) : (
              <button 
                onClick={handleCreateGuideRoom}
                disabled={isCreatingGuide}
                className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl border border-slate-700 shadow-md transition-all whitespace-nowrap disabled:opacity-50"
              >
                {isCreatingGuide ? '構築中...' : '🛠️ 参加手順ルームを自動作成'}
              </button>
            )}
          </div>
        </div>


        {/* 参加者招待URLパネル */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            参加者招待URL
          </h2>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              readOnly 
              value={registrationUrl} 
              className="flex-1 bg-slate-950 border border-slate-700 text-slate-300 font-mono text-sm rounded-xl px-4 py-3 focus:outline-none"
            />
            <button 
              onClick={handleCopyUrl}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md w-36 text-center ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              {copied ? '✅ コピー完了' : '📋 コピーする'}
            </button>
          </div>
        </div>

        {/* 機能リンクパネルのグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to={`/admin/dashboard/${hackathonId}`} className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">👥</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">参加者ダッシュボード</h3>
            <p className="text-sm text-slate-400 leading-relaxed">参加者一覧、アンケート回答の確認、CSVエクスポートを行います。</p>
          </Link>

          <Link to={`/admin/survey/${hackathonId}`} className="group bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">📋</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">アンケート設問設定</h3>
            <p className="text-sm text-slate-400 leading-relaxed">参加登録時に回答してもらう質問項目を動的に作成・管理します。</p>
          </Link>

          <Link to={`/admin/teams/${hackathonId}`} className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">🧩</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">チーム編成</h3>
            <p className="text-sm text-slate-400 leading-relaxed">手動振り分け、および未所属メンバーのランダム均等一括編成を行います。</p>
          </Link>

          <Link to={`/admin/workspaces/${hackathonId}`} className="group bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">🏢</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">ルーム自動生成</h3>
            <p className="text-sm text-slate-400 leading-relaxed">各チーム専用の作業ルームを一括構築し、4桁のパスワードを割り当てます。</p>
          </Link>

          <Link to={`/admin/notify/${hackathonId}`} className="group bg-slate-900 border border-slate-800 hover:border-yellow-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">📢</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">告知・個別メール</h3>
            <p className="text-sm text-slate-400 leading-relaxed">参加者ID、所属チーム名、および専用ルームURLを差し込んだメールを生成します。</p>
          </Link>
          <Link to={`/admin/statistics/${hackathonId}`} 
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">📊</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">進捗アナリティクス</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              各チームのタスク消化状況やクリティカルパスの危険度をリアルタイムに俯瞰します。
            </p>
          </Link>
        </div>
      </div>

      {/* 💡 先ほど作成した統計モーダルのラッパーコンポーネントを配置 */}
      <AdminRoomStatsModal
        isOpen={statsTargetRoom !== null}
        onClose={() => setStatsTargetRoom(null)}
        roomId={statsTargetRoom?.id || ''}
        roomName={statsTargetRoom?.name || ''}
      />
    </div>
  );
};