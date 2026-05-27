import { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import type { FormField } from '../hooks/useFormFields';
import type { Task } from '../hooks/useTasks';

type Props = {
  roomId: string;
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  initialParentId?: string | 'HEAD'; // ★ 追加: ツリーから渡される初期の親ID
};

export const AddTaskForm = ({ roomId, formFields, tasks, isOpen, onClose, initialParentId = 'HEAD' }: Props) => {
  const { addTask, isLoading } = useTasks(roomId);
  
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  // ★ 追加: 合流させるタスクのIDリストを管理
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  // モーダルが開くたびに、初期値をセットする
  useEffect(() => {
    if (isOpen) {
      setChosenPrevTaskId(initialParentId);
      setMergedTaskIds([]); // リセット
    }
  }, [isOpen, initialParentId]);

  if (!isOpen) return null;

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleMergeToggle = (taskId: string) => {
    setMergedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalMetadata = { ...customMetadata };
    formFields.forEach((field) => {
      if (field.field_type === 'color' && !finalMetadata[field.field_key]) {
        finalMetadata[field.field_key] = '#c7d2fe';
      }
    });

    // ★ 合流タスクの情報をメタデータにこっそり保存
    if (mergedTaskIds.length > 0) {
      finalMetadata.merged_task_ids = mergedTaskIds;
    }

    const prevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;

    await addTask(title, assignee, startDate, endDate, finalMetadata, prevId);

    setTitle(''); setAssignee(''); setStartDate(''); setEndDate('');
    setCustomMetadata({}); setMergedTaskIds([]); setChosenPrevTaskId('HEAD');
    onClose();
  };

  // メインの親として選ばれているタスクは、合流リストから除外する
  const availableMergeTasks = tasks.filter(t => t.id !== chosenPrevTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">📝 タスクをチェーンに追加</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メインの接続先 */}
          <div>
            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">🔗 メインの分岐元（親タスク）</label>
            <select
              value={chosenPrevTaskId}
              onChange={(e) => {
                setChosenPrevTaskId(e.target.value);
                setMergedTaskIds(prev => prev.filter(id => id !== e.target.value)); // メインに選んだら合流から外す
              }}
              className="w-full px-3 py-2 border-2 border-blue-100 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="HEAD">一番先頭に繋ぐ（前にタスクなし）</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title} から分岐</option>)}
            </select>
          </div>

          {/* ★ 追加: 合流（マージ）の選択 */}
          {tasks.length > 0 && availableMergeTasks.length > 0 && (
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">🔀 他のタスクとも合流させる（任意）</label>
              <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                {availableMergeTasks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-purple-100/50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={mergedTaskIds.includes(t.id)}
                      onChange={() => handleMergeToggle(t.id)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    {t.title}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">タスク名</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">担当者</label>
              <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {formFields.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">追加カスタム項目</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                    <input type={field.field_type} value={customMetadata[field.field_key] || ''} onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">キャンセル</button>
            <button type="submit" disabled={isLoading || !title.trim()} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">チェーンに繋ぐ</button>
          </div>
        </form>
      </div>
    </div>
  );
};