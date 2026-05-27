import { useState } from 'react';
import { useFormFields } from '../hooks/useFormFields';

type Props = {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
};

export const AddFieldForm = ({ roomId, isOpen, onClose }: Props) => {
  const { addField, isLoading } = useFormFields(roomId);
  const [label, setLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');

  if (!isOpen) return null; // 開いていない時は何も表示しない

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !fieldKey.trim()) return;

    await addField(label, fieldKey, fieldType);
    setLabel('');
    setFieldKey('');
    setFieldType('text');
    onClose(); // 追加に成功したら自動で閉じる
  };

  return (
    // 画面全体を覆う薄暗い背景（オーバーレイ）
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* 背景クリックでも閉じられるようにする */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* モーダル本体 */}
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">✨ 新しいカスタム項目を追加</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">＆times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">表示名 (例: 難易度)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">システムキー (例: difficulty)</label>
            <input
              type="text"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="英数字のみ"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">入力タイプ</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="text">テキスト (短文)</option>
              <option value="number">数値</option>
              <option value="color">カラーピッカー</option>
              <option value="date">日付</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              項目を追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};