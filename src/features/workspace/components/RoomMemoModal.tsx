import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Room } from '../../../types';

type Props = {
  room: Room | null;
  isOpen: boolean;
  isAuth: boolean;
  onClose: () => void;
  onUpdateRoom: (updates: Partial<Room>) => Promise<boolean>;
};

export const RoomMemoModal = ({ room, isOpen, isAuth, onClose, onUpdateRoom }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [memoInput, setMemoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && room) {
      setMemoInput(room.memo || '');
      setIsEditing(false);
    }
  }, [isOpen, room]);

  if (!isOpen || !room) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdateRoom({ memo: memoInput });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 max-h-[85vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h2 className="text-lg font-bold text-gray-800">ルームメモ・共有リンク</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {!isEditing ? (
            memoInput ? (
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" {...props} />
                  }}
                >
                  {memoInput}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 py-10">
                <span className="text-4xl opacity-50">📑</span>
                <p className="text-sm font-bold">メモはまだありません</p>
                <p className="text-xs">ドキュメントのURLやチームのルールを書き残しておけます。</p>
              </div>
            )
          ) : (
            <textarea
              value={memoInput}
              onChange={e => setMemoInput(e.target.value)}
              placeholder="Markdownで入力できます (例: [要件定義書](https://...))"
              className="w-full h-full min-h-[300px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              autoFocus
            />
          )}
        </div>

        {isAuth && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
                メモを編集する
              </button>
            ) : (
              <>
                <button onClick={() => { setIsEditing(false); setMemoInput(room.memo || ''); }} className="px-5 py-2 text-gray-500 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors">
                  キャンセル
                </button>
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-50">
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};