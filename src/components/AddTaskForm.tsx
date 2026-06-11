import { useState, useEffect } from 'react';
import type { FormField, Task, TaskMetadata, TaskStatus } from '../types';

type Props = {
  roomId: string;
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  validateConnection: (targetPrevId: string | 'HEAD' | null | undefined, currentTaskId: string | null) => boolean;
  onSubmit: (title: string, assignee: string, start: string, end: string, meta: TaskMetadata, prevId: string | null) => Promise<void>;
  initialParentId?: string | 'HEAD';
  isLoading: boolean;
};

// タスク新規作成モーダル
export const AddTaskForm = ({ formFields, tasks, isOpen, onClose, validateConnection, onSubmit, initialParentId = 'HEAD', isLoading }: Props) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState<TaskStatus>('未着手');
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  const hasRootAlready = tasks.length > 0;

  // モーダルが開かれたときにフォームを初期化
  useEffect(() => {
    if (isOpen) {
      setTitle(''); 
      setAssignee(''); 
      setStartDate(''); 
      setEndDate(''); 
      setMemo(''); 
      setMergedTaskIds([]); 
      setStatus('未着手');
      
      const initialMeta: Record<string, any> = {};
      formFields.forEach(f => { 
        initialMeta[f.field_key] = f.field_type === 'color' ? '#c7d2fe' : ''; 
      });
      setCustomMetadata(initialMeta);
      
      setChosenPrevTaskId(initialParentId === 'HEAD' && hasRootAlready ? tasks[0].id : initialParentId);
    }
  }, [isOpen, initialParentId, hasRootAlready, tasks, formFields]);

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

    // メタデータの構築
    const finalMetadata: TaskMetadata = {
      ...customMetadata,
      status,
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(mergedTaskIds.length > 0 ? { merged_task_ids: mergedTaskIds } : {})
    };

    const prevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;
    await onSubmit(title, assignee, startDate, endDate, finalMetadata, prevId);
    onClose();
  };

  const availableMergeTasks = tasks.filter(t => t.id !== chosenPrevTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto space-y-4 text-gray-800">
        <h3 className="text-xl font-bold text-gray-800">タスクの追加</h3>
        
        {/* 先行タスク選択 */}
        <div>
          <label className="block text-xs font-bold text-blue-600 mb-1">先行タスク (親ノード)</label>
          <select 
            value={chosenPrevTaskId} 
            onChange={(e) => { 
              setChosenPrevTaskId(e.target.value); 
              setMergedTaskIds(prev => prev.filter(id => id !== e.target.value)); 
            }} 
            className="w-full px-3 py-2 border-2 border-blue-100 bg-blue-50/50 rounded-lg font-medium text-sm"
          >
            {!hasRootAlready ? (
              <option value="HEAD">ルートノードとして作成</option>
            ) : (
              tasks.map(t => {
                const isSafe = validateConnection(t.id, null);
                return (
                  <option key={t.id} value={t.id} disabled={!isSafe}>
                    {t.title} から分岐 {!isSafe && '(循環参照の恐れがあるため選択不可)'}
                  </option>
                );
              })
            )}
          </select>
        </div>

        {/* 基本情報入力 */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">ステータス</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full px-3 py-2 border rounded-lg bg-white text-sm">
            <option value="未着手">未着手</option>
            <option value="着手中">着手中</option>
            <option value="終了">終了</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border">
          <div>
            <label className="block text-xs text-gray-500 mb-1">タスク名</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">担当者</label>
            <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">メモ</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} placeholder="タスクに関する補足などを入力" className="w-full p-2 border rounded-lg bg-white text-sm resize-none" />
          </div>
        </div>

        {/* カスタムフィールド入力 */}
        {formFields.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">カスタムフィールド</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formFields.map(f => (
                <div key={f.id} className="text-sm">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <input
                    type={f.field_type}
                    value={customMetadata[f.field_key] ?? ''}
                    onChange={e => handleCustomFieldChange(f.field_key, e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 合流タスク選択 */}
        {hasRootAlready && availableMergeTasks.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">合流タスク (複数選択による依存関係の収束)</label>
              <div className="max-h-28 overflow-y-auto flex flex-col gap-1 bg-white p-2.5 rounded-lg border">
                {availableMergeTasks.map(t => {
                  const isLinkSafe = validateConnection(t.id, null);
                  return (
                    <label 
                      key={t.id} 
                      className={`flex items-center text-sm p-1 rounded transition-colors
                        ${!isLinkSafe ? 'opacity-40 bg-red-50 text-red-700 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={mergedTaskIds.includes(t.id)}
                        onChange={() => isLinkSafe && handleMergeToggle(t.id)}
                        disabled={!isLinkSafe}
                        className="rounded text-blue-600 w-4 h-4"
                      />
                      <span className="ml-2 font-medium">
                        {t.title} {!isLinkSafe && <span className="text-[10px] font-bold text-red-500">(循環参照リスク)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* フッターアクション */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 text-sm">キャンセル</button>
          <button type="submit" disabled={isLoading || !title.trim()} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg text-sm">作成</button>
        </div>
      </form>
    </div>
  );
};