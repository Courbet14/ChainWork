import { useState, useEffect } from 'react';
import type { FormField } from '../hooks/useFormFields';
import type { Task, TaskStatus } from '../hooks/useTasks'; // 💡 正しい型をインポート

type Props = {
  roomId: string;
  task: Task | null;
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export const EditTaskModal = ({ task, formFields, tasks, isOpen, onClose, onUpdate, onDelete }: Props) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('未着手');
  const [endDate, setEndDate] = useState('');
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '');
      setAssignee(task.assignee || '');
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      setChosenPrevTaskId(task.prev_task_id || 'HEAD');
      
      // 💡 型安全に metadata から値を展開
      const meta = task.metadata;
      setMergedTaskIds(meta.merged_task_ids || []);
      setStatus(meta.status || '未着手');
      
      // status と merged_task_ids 以外のカスタム項目を抽出してセット
      const { status: _, merged_task_ids: __, ...rest } = meta;
      setCustomMetadata(rest || {});
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

    // 💡 既存のカスタム項目と進捗、合流をマージした新しいオブジェクトを作成
    const finalMetadata = {
      ...customMetadata,
      status,
      ...(mergedTaskIds.length > 0 ? { merged_task_ids: mergedTaskIds } : {})
    };

    const prevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;

    await onUpdate(task.id, {
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
    if (window.confirm(`「${title}」を本当に削除しますか？`)) {
      await onDelete(task.id);
      onClose();
    }
  };

  const validParentCandidates = tasks.filter(item => item.id !== task.id && item.prev_task_id !== task.id);
  const availableMergeTasks = validParentCandidates.filter(item => item.id !== chosenPrevTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">🛠️ タスクの詳細編集 / 付け替え</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 親の変更 */}
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
              {validParentCandidates.map((item) => (
                <option key={item.id} value={item.id}>{item.title} の後ろへ</option>
              ))}
            </select>
          </div>

          {/* 進捗ステータス変更 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">📊 進捗ステータスを変更</label>
            <div className="flex gap-2">
              {(['未着手', '着手中', '終了'] as TaskStatus[]).map((s) => {
                const isActive = status === s;
                let activeColor = 'bg-slate-600 text-white border-slate-600';
                if (s === '着手中') activeColor = 'bg-amber-500 text-white border-amber-500';
                if (s === '終了') activeColor = 'bg-emerald-600 text-white border-emerald-600';

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 text-xs font-bold border rounded-xl transition-all shadow-sm
                      ${isActive ? activeColor : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {s === '未着手' && '⚪ '}
                    {s === '着手中' && '🟡 '}
                    {s === '終了' && '🟢 '}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 合流タスク */}
          {availableMergeTasks.length > 0 && (
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">🔀 合流元のタスクを追加・変更</label>
              <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                {availableMergeTasks.map(item => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={mergedTaskIds.includes(item.id)} onChange={() => handleMergeToggle(item.id)} className="rounded text-purple-600" />
                    <span className="ml-2">{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 基本入力 */}
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

          {/* カスタム項目 */}
          {formFields.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">カスタム項目を編集</h4>
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

          <div className="flex justify-between gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={handleDelete} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg transition-colors text-sm">🗑️ タスクを削除</button>
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