import { useState } from 'react';

type Props = {
  onJoin: (roomId: string) => void;
  disabled: boolean;
};

// 既存のルームに参加するための入力フォーム
export const JoinRoomForm = ({ onJoin, disabled }: Props) => {
  const [inputRoomId, setInputRoomId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      onJoin(inputRoomId.trim());
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4">
      <h3 className="text-lg font-bold text-gray-800">既存のルームに参加</h3>
      <form onSubmit={handleSubmit} className="space-y-3 pt-2">
        <input
          type="text"
          placeholder="ルームIDを入力"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-600 bg-gray-50/50"
          required
        />
        <button 
          type="submit" 
          disabled={disabled || !inputRoomId.trim()} 
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
        >
          チェックイン
        </button>
      </form>
    </div>
  );
};