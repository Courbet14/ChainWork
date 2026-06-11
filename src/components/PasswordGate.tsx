import React from 'react';

type Props = {
  roomId: string;
  roomName: string;
  authError: boolean;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

// パスワード入力による認証ゲート画面
export const PasswordGate = ({ roomId, roomName, authError, passwordInput, setPasswordInput, onSubmit }: Props) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white font-sans">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-wide text-slate-100">ルーム保護</h1>
          <p className="text-xs text-slate-400 font-mono">Room ID: {roomId}</p>
          <p className="text-sm font-bold text-blue-400 mt-2">{roomName}</p>
        </div>
        
        <p className="text-xs text-slate-400 leading-relaxed px-4">
          このワークスペースはパスワードによって保護されています。<br />アクセスするにはパスワードを入力してください。
        </p>

        <form onSubmit={onSubmit} className="space-y-3 text-left">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1">パスワード</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              autoFocus
              className={`w-full bg-slate-950 text-slate-200 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors
                ${authError ? 'border-red-500 focus:border-red-500 bg-red-950/10' : 'border-slate-800 focus:border-blue-500'}`}
            />
          </div>

          {authError && (
            <p className="text-[11px] text-red-400 font-medium pl-1 animate-bounce">
              パスワードが一致しません。
            </p>
          )}

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg mt-2"
          >
            ロックを解除
          </button>
        </form>
      </div>
    </div>
  );
};