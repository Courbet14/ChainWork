import { useState } from 'react';
import { useFormFields } from '../hooks/useFormFields';

type Props = { 
  roomId: string; 
  isOpen: boolean; 
  onClose: () => void; 
};

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
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm relative z-10 space-y-4">
        <h3 className="text-md font-bold text-gray-800">カスタムフィールドを追加</h3>
        
        <input 
          type="text" 
          placeholder="フィールドKey (例: priority)" 
          value={key} 
          onChange={e => setKey(e.target.value.replace(/[^a-z_]/g, ''))} 
          className="w-full p-2 border rounded-lg text-sm font-mono" 
          required 
        />
        
        <input 
          type="text" 
          placeholder="表示名 (例: 優先度)" 
          value={label} 
          onChange={e => setLabel(e.target.value)} 
          className="w-full p-2 border rounded-lg text-sm" 
          required 
        />
        
        <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
          <option value="text">テキスト</option>
          <option value="number">数値</option>
          <option value="date">日付</option>
          <option value="color">カラーピッカー</option>
        </select>
        
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-3 py-1">キャンセル</button>
          <button type="submit" disabled={!key || !label} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">追加</button>
        </div>
      </form>
    </div>
  );
};