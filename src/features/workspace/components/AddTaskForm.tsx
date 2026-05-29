import { useState, useEffect } from 'react';
import type { FormField } from '../hooks/useFormFields';
import type { Task, TaskMetadata, TaskStatus } from '../hooks/useTasks'; // 💡 正しい型定義をインポート

type Props = {
  roomId: string;
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  // 💡 onSubmit の引数の型を anｙ ではなく TaskMetadata に厳格化
  onSubmit: (title: string, assignee: string, start: string, end: string, meta: TaskMetadata, prevId: string | null) => Promise<void>;
  initialParentId?: string | 'HEAD';
  isLoading: boolean;
};

export const AddTaskForm = ({ formFields, tasks, isOpen, onClose, onSubmit, initialParentId = 'HEAD', isLoading }: Props) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('未着手'); // 💡 TaskStatus 型を適用
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  const hasRootAlready = tasks.length > 0;

  useEffect(() => {
    if (isOpen) {
      setTitle(''); 
      setAssignee(''); 
      setStartDate(''); 
      setEndDate(''); 
      setCustomMetadata({}); 
      setMergedTaskIds([]);
      setStatus('未着手');
      
      if (initialParentId === 'HEAD' && hasRootAlready) {
        setChosenPrevTaskId(tasks[0].id);
      } else {
        setChosenPrevTaskId(initialParentId);
      }
    }
  }, [isOpen, initialParentId, hasRootAlready, tasks]);

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

    // 💡 拡張フィールドのデフォルト補完と status、merged_task_ids を型安全に1つのオブジェクトにまとめる
    const finalMetadata: TaskMetadata = {
      ...customMetadata,
      status,
      ...(mergedTaskIds.length > 0 ? { merged_task_ids: mergedTaskIds } : {})
    };

    formFields.forEach((field) => {
      if (field.field_type === 'color' && !finalMetadata[field.field_key]) {
        finalMetadata[field.field_key] = '#c7d2fe';
      }
    });

    const prevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;
    await onSubmit(title, assignee, startDate, endDate, finalMetadata, prevId);
    onClose();
  };

  const availableMergeTasks = tasks.filter(t => t.id !== chosenPrevTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📝 タスクをチェーンに追加</h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 分岐元の選択 */}
          <div>
            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">🔗 分岐元（親タスク）</label>
            <select
              value={chosenPrevTaskId}
              onChange={(e) => setChosenPrevTaskId(e.target.value)}
              className="w-full px-3 py-2 border-2 border-blue-100 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {!hasRootAlready ? (
                <option value="HEAD">このページの「最初の起源ノード」にする</option>
              ) : (
                tasks.map((t) => <option key={t.id} value={t.id}>{t.title} から分岐</option>)
              )}
            </select>
          </div>

          {/* 初期進捗ステータスの設定 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📊 初期ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-sm"
            >
              <option value="未着手">⚪ 未着手</option>
              <option value="着手中">🟡 着手中</option>
              <option value="終了">🟢 終了</option>
            </select>
          </div>

          {/* 基本項目グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">タスク名</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border bg-white rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">担当者</label>
              <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3 py-2 border bg-white rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">開始時期</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border bg-white rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">終了時期</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border bg-white rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* カスタムフィールド */}
          {formFields.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
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

          {/* オプション：合流（マージ）セクション */}
          {hasRootAlready && availableMergeTasks.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">🔀 他のタスクとも合流させる（オプション）</label>
                <div className="max-h-28 overflow-y-auto flex flex-col gap-1.5 bg-white p-2.5 rounded-lg border border-purple-100/50">
                  {availableMergeTasks.map(t => (
                    <label key={t.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer hover:bg-purple-50 p-1 rounded">
                      <input type="checkbox" checked={mergedTaskIds.includes(t.id)} onChange={() => handleMergeToggle(t.id)} className="rounded text-purple-600 w-4 h-4" />
                      <span className="ml-2 font-medium">{t.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">キャンセル</button>
            <button type="submit" disabled={isLoading || !title.trim()} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">チェーンに繋ぐ</button>
          </div>
        </form>
      </div>
    </div>
  );
};