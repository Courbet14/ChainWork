import { QRCodeSVG } from 'qrcode.react';

type Props = {
  roomId: string;
  roomName: string;
  cloneUrl: string;
  copied: boolean;
  onCopy: () => void;
  onBack: () => void;
};

// 共有リンクを発行して表示する発信側のUI
export const ShareLinkSender = ({ roomId, roomName, cloneUrl, copied, onCopy, onBack }: Props) => {
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
              <p className="text-sm font-mono text-blue-400 font-bold">{roomId}</p>
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
                onClick={onCopy}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex-shrink-0
                  ${copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {copied ? 'コピー完了' : 'コピー'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={onBack} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-sm border border-slate-700 transition-colors">
            ワークスペースに戻る
          </button>
        </div>
      </div>
    </div>
  );
};