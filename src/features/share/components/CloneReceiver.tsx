type Props = {
  roomId: string;
  roomName: string;
  isCopyable: boolean;
  isCloning: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

export const CloneReceiver = ({ roomId, roomName, isCopyable, isCloning, onAccept, onCancel }: Props) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-6 p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-wide text-white">テンプレートの受信</h1>
          <p className="text-xs text-slate-500 font-mono">Template ID: {roomId}</p>
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
              onClick={onAccept}
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
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-400 block mx-auto underline">
          トップに戻る
        </button>
      </div>
    </div>
  );
};