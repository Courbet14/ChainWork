import { useState } from 'react';
import { useFormFields } from '../hooks/useFormFields';

type Props = { roomId: string; isOpen: boolean; onClose: () => void; };

export const AddFieldForm = ({ roomId, isOpen, onClose }: Props) => {
  const { addField } = useFormFields(roomId);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !label.trim()) return;
    addField(key.trim().toLowerCase(), label.trim(), type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm relative z-10 space-y-4">
        <h3 className="text-md font-bold text-gray-800">⚙️ カスタム入力項目を追加</h3>
        <input type="text" placeholder="フィールドKey (例: bug_level)" value={key} onChange={e => setKey(e.target.value.replace(/[^a-z_]/g, ''))} className="w-full p-2 border rounded-lg text-sm font-mono" required />
        <input type="text" placeholder="表示名 (例: バグ重要度)" value={label} onChange={e => setLabel(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
        <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
          <option value="text">📄 通常テキスト</option>
          <option value="number">🔢 数値入力</option>
          <option value="date">📅 日付選択</option>
          <option value="color">🎨 カラーピッカー</option>
        </select>
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">スキーマに登録</button>
      </form>
    </div>
  );
};