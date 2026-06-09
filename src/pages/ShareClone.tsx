import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';

export const ShareClone = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCloneMode = location.pathname.includes('/clone');

  const [roomName, setRoomName] = useState<string>('');
  const [isCopyable, setIsCopyable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const { cloneWholeRoom, isLoading: isCloning } = useRoom(id);

  const cloneUrl = `${window.location.protocol}//${window.location.host}/clone/${id}`;

  useEffect(() => {
    const fetchRoomInfo = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('rooms')
          .select('name, is_copyable')
          .eq('id', id)
          .maybeSingle() as any;

        if (error) throw error;
        if (data) {
          setRoomName(data.name);
          setIsCopyable(data.is_copyable ?? true);
        } else {
          setRoomName('不明なルーム');
          setIsCopyable(false);
        }
      } catch (err) {
        console.error(err);
        setIsCopyable(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomInfo();
  }, [id]);

  // 💡 ボタンを押したときの確実な新規作成＆自動大ジャンプ
  const handleAcceptCloneAction = async () => {
    if (!id) return;
    
    // お友達向けに、ランダムな新しい固有ルームIDを生成
    const myNewRoomId = `student-${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. 新しい部屋を Supabase に登録
      const { error: roomCreateErr } = await supabase
        .from('rooms')
        .insert({
          id: myNewRoomId,
          name: `📋 ${roomName} のコピー`,
          is_copyable: true
        });

      if (roomCreateErr) throw roomCreateErr;

      // 2. ページ、フォルダ、そして今回実装した「全タスク＆全矢印」を裏でインサート
      const success = await cloneWholeRoom(id, myNewRoomId);
      
      if (success) {
        // メモリが強制リロードで死ななくなったため、ここが100%発火します！
        alert('🎉 ロードマップとタスクの同期が完了しました！専用ワークスペースへ移動します。');
        navigate(`/workspace/${myNewRoomId}`);
      }
    } catch (err) {
      console.error('Clone execution error:', err);
      alert('❌ ワークスペースの展開中にエラーが発生しました。');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cloneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('URLのコピーに失敗しました。');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 📥 配布URLを直接踏んでやってきたユーザー用のUI
  if (isCloneMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/50 p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
            📥
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-wide text-white">共有テンプレートの受信</h1>
            <p className="text-xs text-slate-500 font-mono">Template ID: {id}</p>
          </div>

          {isCopyable ? (
            <>
              <div className="bg-slate-900/60 border border-slate-700/40 p-4 rounded-xl text-left">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">コピー元</span>
                <span className="text-sm font-bold text-blue-400 font-mono block truncate">📂 {roomName}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed px-2">
                このロードマップをあなた専用の新しい独立したワークスペースとして丸ごと複製し、編集可能な状態でマイページに展開します。
              </p>
              <button
                onClick={handleAcceptCloneAction}
                disabled={isCloning}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-blue-600/10"
              >
                {isCloning ? 'ワークスペースを構築中...' : '自分用の部屋として展開する'}
              </button>
            </>
          ) : (
            <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl space-y-1">
              <span className="text-sm block font-bold text-red-300">🔒 コピーが禁止されています</span>
              <p className="text-xs text-red-400 leading-relaxed">
                このルームの管理者が「配布コピー：禁止中」に設定しているため、インポートできません。
              </p>
            </div>
          )}
          <button onClick={() => navigate('/')} className="text-xs text-slate-500 hover:text-slate-400 block mx-auto underline transition-colors">
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  // 🔗 ワークスペース側から開かれた用のUI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 p-8 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full" />

        <div className="text-center space-y-2">
          <div className="inline-flex px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-500/20">
            Share Link & QR Generator
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            🔗 ワークスペース複製用リンクの発行
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            学生やチームメンバーにこのページを共有するか、QRコードをスライドに貼り付けて提示してください。
          </p>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-slate-700/30 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">🏠 対象ルーム名</label>
              <p className="text-base font-bold text-white truncate">{roomName}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">🔑 コピー元 ルームID</label>
              <p className="text-sm font-mono text-blue-400 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50 inline-block">{id}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-700/30">
          <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-indigo-500/30 flex-shrink-0 flex flex-col items-center justify-center group transition-transform hover:scale-105">
            <QRCodeSVG value={cloneUrl} size={160} level="H" includeMargin={false} />
            <span className="text-[10px] text-slate-500 font-bold mt-2 tracking-wide uppercase">Scan to Clone</span>
          </div>

          <div className="flex-1 w-full space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">🌐 クローン専用セキュアURL</label>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 pl-3">
              <input type="text" readOnly value={cloneUrl} className="bg-transparent text-xs font-mono text-slate-300 flex-1 outline-none select-all" />
              <button
                onClick={handleCopy}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex-shrink-0
                  ${copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'}`}
              >
                {copied ? '✅ コピー完了' : '📋 コピー'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              💡 <span className="font-bold text-slate-200">ハッカソンTips:</span> このリンクをブラウザで踏むと、瞬時にこの部屋のタスク構造・カスタムカラムが全自動コピーされ、自分専用の独立したワークスペースが生成されます。
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate(`/workspace/${id}`)}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-sm transition-all border border-slate-600 shadow-md text-center"
          >
            &larr; 元のワークスペースに戻る
          </button>
          
          <button
            onClick={() => navigate(`/clone/${id}`)}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg text-center flex items-center justify-center gap-1.5"
          >
            🚀 実際にクローン動作をテストする &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};