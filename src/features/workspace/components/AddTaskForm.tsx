import { useState, useEffect } from 'react';
import type { FormField, Task, TaskMetadata, TaskStatus } from '../../../types';

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

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAssignee('');
      setStartDate('');
      setEndDate('');
      setMemo('');
      setStatus('未着手');
      setCustomMetadata({});
      setMergedTaskIds([]);
      setChosenPrevTaskId(hasRootAlready ? initialParentId : 'HEAD');
    }
  }, [isOpen, initialParentId, hasRootAlready]);

  if (!isOpen) return null;

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleMergeToggle = (mergeTaskId: string) => {
    setMergedTaskIds(prev => prev.includes(mergeTaskId) ? prev.filter(id => id !== mergeTaskId) : [...prev, mergeTaskId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const metadata: TaskMetadata = {
      status,
      memo,
      merged_task_ids: mergedTaskIds,
      ...customMetadata
    };

    const finalPrevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;
    await onSubmit(title.trim(), assignee.trim(), startDate, endDate, metadata, finalPrevId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-xl relative z-10 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h3 className="text-lg font-bold text-gray-800">新規タスク作成</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">タイトル <span className="text-red-400">*</span></label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full p-2 border rounded-lg text-sm font-bold" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">ステータス</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full p-2 border rounded-lg text-sm bg-white font-bold">
              <option value="未着手">未着手</option>
              <option value="着手中">着手中</option>
              <option value="終了">終了</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">担当者</label>
            <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">開始日</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">終了日</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm font-mono" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">メモ・詳細 (Markdown)</label>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} className="w-full p-2 border rounded-lg text-sm font-mono" />
        </div>

        {formFields.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 mt-2">
            <p className="text-xs font-bold text-gray-500 mb-3">カスタムフィールド</p>
            <div className="grid grid-cols-2 gap-4">
              {formFields.map(f => (
                <div key={f.id}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <input type={f.field_type} value={customMetadata[f.field_key] || ''} onChange={e => handleCustomFieldChange(f.field_key, e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {hasRootAlready && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 mt-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">メインの依存関係（親タスク）</label>
              <select 
                value={chosenPrevTaskId} 
                onChange={e => setChosenPrevTaskId(e.target.value)} 
                className="w-full p-2 border rounded-lg text-sm bg-white"
              >
                <option value="HEAD">-- 依存なし（ルートタスク） --</option>
                {tasks.map(t => {
                  const isSafe = validateConnection(t.id, null);
                  return (
                    <option key={t.id} value={t.id} disabled={!isSafe}>
                      {t.title} {!isSafe ? ' (循環参照エラー)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">その他の合流（マージ）タスク</label>
              <div className="max-h-32 overflow-y-auto bg-white border rounded-lg p-2 space-y-1">
                {tasks.filter(t => t.id !== chosenPrevTaskId).map(t => {
                  const isLinkSafe = validateConnection(t.id, null);
                  return (
                    <label 
                      key={t.id} 
                      className={`flex items-center text-sm p-1 rounded transition-colors ${!isLinkSafe ? 'opacity-40 bg-red-50 text-red-700 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 text-sm">キャンセル</button>
          <button type="submit" disabled={isLoading || !title.trim()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg text-sm shadow-md transition-colors">
            作成
          </button>
        </div>
      </form>
    </div>
  );
};