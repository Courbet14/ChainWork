import { useState, useEffect } from 'react';

type Props = {
  room: { name: string; edit_password: string | null } | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRoom: (newName: string, newPassword: string | null) => Promise<boolean>;
};

export const EditRoomModal = ({ room, isOpen, onClose, onUpdateRoom }: Props) => {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && room) {
      setRoomName(room.name || '');
      setPassword(room.edit_password || '');
    }
  }, [isOpen, room]);

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setIsSaving(true);

    const finalPassword = password.trim() || null;
    const success = await onUpdateRoom(roomName.trim(), finalPassword);
    
    setIsSaving(false);
    if (success) {
      onClose();
    } else {
      alert('設定の更新に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md relative z-10 space-y-4">
        <h3 className="text-lg font-bold text-gray-800">ワークスペース設定</h3>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">ワークスペース名</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">編集用パスワード</label>
          <input
            type="password"
            placeholder="パスワードを解除する場合は空欄にしてください"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 text-sm font-medium">キャンセル</button>
          <button type="submit" disabled={isSaving || !roomName.trim()} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg text-sm shadow-md transition-colors disabled:opacity-50">
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
};