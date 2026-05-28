import { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import type { FormField } from '../hooks/useFormFields';
import type { Task } from '../hooks/useTasks';

type Props = {
  roomId: string;
  task: Task | null; // 編集対象のタスク（開いてない時はnull）
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
};

export const EditTaskModal = ({ roomId, task, formFields, tasks, isOpen, onClose }: Props) => {
  const { updateTask, deleteTask } = useTasks(roomId);

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  // モーダルに対象タスクがセットされたら、初期値をフォームに流し込む
  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '');
      setAssignee(task.assignee || '');
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      setCustomMetadata(task.metadata || {});
      setChosenPrevTaskId(task.prev_task_id || 'HEAD');
      setMergedTaskIds(task.metadata.merged_task_ids || []);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleMergeToggle = (id: string) => {
    setMergedTaskIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalMetadata = { ...customMetadata };
    if (mergedTaskIds.length > 0) {
      finalMetadata.merged_task_ids = mergedTaskIds;
    } else {
      delete finalMetadata.merged_task_ids;
    }

    const prevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;

    await updateTask(task.id, {
      title,
      assignee: assignee || null,
      start_date: startDate || null,
      end_date: endDate || null,
      prev_task_id: prevId,
      metadata: finalMetadata,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm(`「${task.title}」を本当に削除しますか？`)) {
      await deleteTask(task.id);
      onClose();
    }
  };

  // 🔥 無限ループ防止：自分自身（task.id）と、自分をメイン親にしてる子タスクを親候補から除外
  const validParentCandidates = tasks.filter(t => t.id !== task.id && t.prev_task_id !== task.id);
  const availableMergeTasks = validParentCandidates.filter(t => t.id !== chosenPrevTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">🛠️ タスクの詳細編集 / 付け替え</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 🔗 チェーンの付け替え（親の変更） */}
          <div>
            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">🔀 メインの接続先（親）を変更する</label>
            <select
              value={chosenPrevTaskId}
              onChange={(e) => {
                setChosenPrevTaskId(e.target.value);
                setMergedTaskIds(prev => prev.filter(id => id !== e.target.value));
              }}
              className="w-full px-3 py-2 border-2 border-blue-100 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="HEAD">先頭へ移動（前にタスクなし）</option>
              {validParentCandidates.map((t) => (
                <option key={t.id} value={t.id}>{t.title} の後ろへ</option>
              ))}
            </select>
          </div>

          {/* 🔀 合流先の変更 */}
          {availableMergeTasks.length > 0 && (
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">🔀 合流元のタスクを追加・変更</label>
              <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                {availableMergeTasks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergedTaskIds.includes(t.id)}
                      onChange={() => handleMergeToggle(t.id)}
                      className="rounded text-purple-600"
                    />
                    {t.title}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 基本項目 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">タスク名</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">担当者</label>
              <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">開始日</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">終了日</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* 動的カスタム項目 */}
          {formFields.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">カスタム項目を編集</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                    <input
                      type={field.field_type}
                      value={customMetadata[field.field_key] || ''}
                      onChange={(e) => handleCustomFieldChange(field.field_key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* フッターアクション（削除ボタンを左、保存を右に配置） */}
          <div className="flex justify-between gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              🗑️ タスクを削除
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">キャンセル</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm">変更を保存</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};