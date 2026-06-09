import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const CreateRoomForm = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setIsLoading(true);

    try {
      const finalId = roomId.trim() || `room-${Math.random().toString(36).substring(2, 7)}`;
      const { data: existing } = await supabase.from('rooms').select('id').eq('id', finalId).maybeSingle();

      if (!existing) {
        await supabase.from('rooms').insert([{
          id: finalId,
          name: roomName.trim(),
          is_copyable: false,
          edit_password: password.trim() || null
        }]);
      }
      navigate(`/workspace/${finalId}`);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800">新規ワークスペースの作成</h3>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">ワークスペース名 (必須)</label>
        <input type="text" placeholder="例: プロジェクトA 開発基盤" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">カスタムID (任意)</label>
        <input type="text" placeholder="例: project-a (空欄時は自動生成)" value={roomId} onChange={(e) => setRoomId(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))} className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-blue-600 bg-gray-50/50" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">編集用パスワード (任意)</label>
        <input type="password" placeholder="未入力の場合は誰でも編集可能" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>
      <button type="submit" disabled={isLoading || !roomName.trim()} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md disabled:opacity-50 transition-colors">
        {isLoading ? '生成中...' : 'ワークスペースを作成'}
      </button>
    </form>
  );
};