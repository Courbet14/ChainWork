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

  const handleAcceptCloneAction = async () => {
    if (!id) return;
    const myNewRoomId = `workspace-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const { error: roomCreateErr } = await supabase
        .from('rooms')
        .insert({ id: myNewRoomId, name: `${roomName} (Clone)`, is_copyable: true });

      if (roomCreateErr) throw roomCreateErr;

      const success = await cloneWholeRoom(id, myNewRoomId);
      
      if (success) {
        navigate(`/workspace/${myNewRoomId}`);
      }
    } catch (err) {
      console.error('Clone execution error:', err);
      alert('ワークスペースの展開中にエラーが発生しました。');
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

  // 受信側（クローン実行画面）のUI
  if (isCloneMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-6 p-8">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-wide text-white">テンプレートの受信</h1>
            <p className="text-xs text-slate-500 font-mono">Template ID: {id}</p>
          </div>

          {isCopyable ? (
            <>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-left">
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">対象</span>
                <span className="text-sm font-bold text-blue-400 font-mono block truncate">{roomName}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed px-2">
                このロードマップを独立したワークスペースとして複製します。
              </p>
              <button
                onClick={handleAcceptCloneAction}
                disabled={isCloning}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all"
              >
                {isCloning ? '構築中...' : 'ワークスペースを展開する'}
              </button>
            </>
          ) : (
            <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl space-y-1">
              <span className="text-sm block font-bold text-red-300">コピーが制限されています</span>
            </div>
          )}
          <button onClick={() => navigate('/')} className="text-xs text-slate-500 hover:text-slate-400 block mx-auto underline">
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  // 発信側（リンク発行画面）のUI
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">共有リンクの発行</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            メンバーにこのリンクを共有するか、QRコードを提示してください。
          </p>
        </div>

        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">対象ワークスペース名</label>
              <p className="text-sm font-bold text-white truncate">{roomName}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">ID</label>
              <p className="text-sm font-mono text-blue-400 font-bold">{id}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <div className="bg-white p-3 rounded-xl flex-shrink-0 flex items-center justify-center">
            <QRCodeSVG value={cloneUrl} size={140} level="H" includeMargin={false} />
          </div>

          <div className="flex-1 w-full space-y-3">
            <label className="block text-[10px] font-bold uppercase text-blue-400">共有用URL</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-2 pl-3">
              <input type="text" readOnly value={cloneUrl} className="bg-transparent text-xs font-mono text-slate-300 flex-1 outline-none select-all" />
              <button
                onClick={handleCopy}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex-shrink-0
                  ${copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {copied ? 'コピー完了' : 'コピー'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={() => navigate(`/workspace/${id}`)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-sm border border-slate-700 transition-colors">
            ワークスペースに戻る
          </button>
        </div>
      </div>
    </div>
  );
};