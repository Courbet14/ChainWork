import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export const AdminCreateHackathon = () => {
  const navigate = useNavigate();
  const [hackathonId, setHackathonId] = useState('');
  const [hackathonName, setHackathonName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!/^[a-zA-Z0-9-_]+$/.test(hackathonId)) {
      setErrorMessage('ハッカソンIDには半角英数字、ハイフン、アンダースコアのみが使用できます。');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const { error } = await supabase.from('hackathons').insert([{ 
        id: hackathonId.trim().toLowerCase(),
        name: hackathonName.trim() 
      }]);

      if (error) {
        if (error.code === '23505') throw new Error('このIDは既に登録されています。別のIDを指定してください。');
        throw error;
      }

      setStatus('success');
      setTimeout(() => navigate(`/admin/home/${hackathonId.trim().toLowerCase()}`), 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'ハッカソンの作成中にエラーが発生しました。');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wider mb-2">ChainWork Platform</h2>
          <p className="text-sm text-slate-400">新しいハッカソンイベントの立ち上げ</p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6 text-center space-y-4">
            <h3 className="text-xl font-bold text-emerald-400">ハッカソンを作成しました</h3>
            <p className="text-sm text-slate-400 leading-relaxed">ダッシュボードに移動しています...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ハッカソンID (URL用スラグ)</label>
              <input 
                type="text" required value={hackathonId} onChange={e => setHackathonId(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">イベント名 (正式名称)</label>
              <input 
                type="text" required value={hackathonName} onChange={e => setHackathonName(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" 
              />
            </div>
            {status === 'error' && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold">{errorMessage}</p>
              </div>
            )}
            <button 
              type="submit" disabled={status === 'loading'} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {status === 'loading' ? 'イベント構築中...' : 'ハッカソンを新規開設する'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};