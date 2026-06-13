import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const AdminCreateHackathon = () => {
  const navigate = useNavigate();
  const [hackathonId, setHackathonId] = useState('');
  const [hackathonName, setHackathonName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 💡 URLの安全性のため、半角英数字とハイフン・アンダースコアのみに制限するバリデーション
    const idRegex = /^[a-zA-Z0-9-_]+$/;
    if (!idRegex.test(hackathonId)) {
      setErrorMessage('ハッカソンIDには半角英数字、ハイフン(-)、アンダースコア(_)のみが使用できます。');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // hackathons テーブルに新規登録
      const { error } = await supabase
        .from('hackathons')
        .insert([
          { 
            id: hackathonId.trim().toLowerCase(), // 大文字小文字の混在を防ぐため小文字に統一
            name: hackathonName.trim() 
          }
        ]);

      if (error) {
        // IDが既に使われている場合の一意制約エラー(23505)のハンドリング
        if (error.code === '23505') {
          throw new Error('このハッカソンIDは既に登録されています。別のIDを指定してください。');
        }
        throw error;
      }

      setStatus('success');
      
      // 2秒後に新しく作ったハッカソンの運営ホームページへ自動遷移
      setTimeout(() => {
        navigate(`/admin/home/${hackathonId.trim().toLowerCase()}`);
      }, 1500);

    } catch (err: any) {
      console.error('Hackathon creation error:', err);
      setErrorMessage(err.message || 'ハッカソンの作成中にエラーが発生しました。');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wider mb-2">ChainWork <span className="text-blue-500">Platform</span></h2>
          <p className="text-sm text-slate-400">新しいハッカソンイベントの立ち上げ</p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6 text-center space-y-4 animate-pulse">
            <div className="text-5xl">🚀</div>
            <h3 className="text-xl font-bold text-emerald-400">ハッカソンを作成しました！</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              管理ダッシュボードに移動しています...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ハッカソンID入力（URL用） */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                ハッカソンID (URL用スラグ) <span className="text-red-400">*</span>
              </label>
              <input 
                type="text" 
                required 
                value={hackathonId} 
                onChange={e => setHackathonId(e.target.value)} 
                placeholder="例: kindai-hack-2026"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors" 
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                ※URLの末尾（`/register/○○`）に使用されます。半角英数字・ハイフンが使えます。
              </p>
            </div>

            {/* ハッカソン名入力 */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                イベント名 (正式名称) <span className="text-red-400">*</span>
              </label>
              <input 
                type="text" 
                required 
                value={hackathonName} 
                onChange={e => setHackathonName(e.target.value)} 
                placeholder="例: 第1回 近畿大学学内ハッカソン"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" 
              />
            </div>

            {/* エラーメッセージ表示 */}
            {status === 'error' && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* 送信ボタン */}
            <button 
              type="submit" 
              disabled={status === 'loading'} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  イベント構築中...
                </>
              ) : (
                '🛠️ ハッカソンを新規開設する'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};