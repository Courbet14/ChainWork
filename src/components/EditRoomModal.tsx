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

    // 💡 核心: 空欄(未入力)のときは完全にパスワードなし(null)にする
    const finalPassword = password.trim() || null;

    const success = await onUpdateRoom(roomName.trim(), finalPassword);
    setIsSaving(false);
    if (success) {
      onClose();
    } else {
      alert('ルーム設定の更新に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md relative z-10 space-y-4 text-gray-800">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">⚙️ ルームの環境設定</h3>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">ルーム名</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">🔒 編集用パスワード（上書き変更）</label>
          <input
            type="password"
            placeholder="空欄にして保存するとパスワードなしになります"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-1">※空欄のまま保存すると、誰でも自由に編集（タスク追加等）ができるオープンな部屋になります。</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 text-sm font-medium">キャンセル</button>
          <button type="submit" disabled={isSaving || !roomName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-sm shadow-md disabled:opacity-50">
            {isSaving ? '保存中...' : '設定を適用'}
          </button>
        </div>
      </form>
    </div>
  );
};