import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { FormField, Task, TaskStatus, TaskMetadata } from '../../../types';

type Props = {
  task: Task | null;
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  isAuth: boolean;
  onClose: () => void;
  validateConnection: (targetPrevId: string | 'HEAD' | null, currentTaskId: string | null) => boolean;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export const EditTaskModal = ({ task, formFields, tasks, isOpen, isAuth, onClose, validateConnection, onUpdate, onDelete }: Props) => {
  const [isEditMode, setIsEditMode] = useState(false);

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState<TaskStatus>('未着手');
  const [stuckReason, setStuckReason] = useState('');
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '');
      setAssignee(task.assignee || '');
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      setStatus(task.metadata?.status || '未着手');
      setStuckReason(task.metadata?.stuck_reason || '');
      setMemo(task.metadata?.memo || '');
      setChosenPrevTaskId(task.prev_task_id || 'HEAD');
      setMergedTaskIds(task.metadata?.merged_task_ids || []);
      
      const customMeta = { ...task.metadata };
      delete customMeta.status;
      delete customMeta.stuck_reason;
      delete customMeta.merged_task_ids;
      delete customMeta.memo;
      setCustomMetadata(customMeta);
      setIsEditMode(false);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleMergeToggle = (mergeTaskId: string) => {
    setMergedTaskIds(prev => prev.includes(mergeTaskId) ? prev.filter(id => id !== mergeTaskId) : [...prev, mergeTaskId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPrevId = chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId;

    const newMetadata: TaskMetadata = {
      status,
      stuck_reason: status === '停滞中' ? stuckReason : undefined,
      memo,
      merged_task_ids: mergedTaskIds,
      ...customMetadata
    };

    await onUpdate(task.id, {
      title,
      assignee,
      start_date: startDate || null,
      end_date: endDate || null,
      prev_task_id: newPrevId,
      metadata: newMetadata
    });

    setIsEditMode(false);
  };

  const getStatusBadge = () => {
    if (status === '着手中') return 'bg-amber-100 text-amber-800';
    if (status === '停滞中') return 'bg-rose-100 text-rose-800 animate-pulse';
    if (status === '終了') return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-hidden flex flex-col">
        {!isEditMode ? (
          <>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getStatusBadge()}`}>
                      {status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">ID: {task.id.substring(0, 8)}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 leading-snug">{task.title}</h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {status === '停滞中' && stuckReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">停滞の理由・課題</p>
                  <p className="font-bold text-sm text-rose-800">{stuckReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">担当者</p>
                  <p className="font-medium text-sm text-gray-800">{task.assignee || '未設定'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">期間</p>
                  <p className="font-medium text-sm text-gray-800 font-mono">
                    {task.start_date && task.end_date ? `${task.start_date} 〜 ${task.end_date}` : '未設定'}
                  </p>
                </div>
                {formFields.map(f => {
                  const val = customMetadata[f.field_key];
                  if (val === undefined || val === '') return null;
                  return (
                    <div key={f.id}>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</p>
                      <p className="font-medium text-sm text-gray-800">{String(val)}</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">メモ・詳細</p>
                {memo ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{memo}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 rounded-xl p-4 border border-gray-100">メモはありません</p>
                )}
              </div>
            </div>
            
            {isAuth && (
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditMode(true)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                  編集する
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-gray-800">タスクを編集</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">タイトル <span className="text-red-400">*</span></label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ステータス</label>
                  <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full p-2 border rounded-lg bg-white font-bold text-sm">
                    <option value="未着手">未着手</option>
                    <option value="着手中">着手中</option>
                    <option value="停滞中">停滞中</option>
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

              {status === '停滞中' && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-rose-700 mb-1">停滞の理由・課題</label>
                  <input type="text" value={stuckReason} onChange={e => setStuckReason(e.target.value)} placeholder="例: APIの仕様待ち、ライブラリのエラーが解決できない等" className="w-full p-2 border border-rose-300 rounded text-sm bg-white focus:ring-rose-500" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">メモ (Markdown)</label>
                <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={4} className="w-full p-2 border rounded-lg text-sm font-mono" />
              </div>

              {formFields.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 mb-3">カスタムフィールド</p>
                  <div className="grid grid-cols-2 gap-4">
                    {formFields.map(f => (
                      <div key={f.id}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                        <input type={f.field_type} value={customMetadata[f.field_key] ?? ''} onChange={e => handleCustomFieldChange(f.field_key, e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">メインの依存関係（親タスク）</label>
                  <select 
                    value={chosenPrevTaskId} 
                    onChange={e => setChosenPrevTaskId(e.target.value)} 
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="HEAD">-- 依存なし（ルートタスク） --</option>
                    {tasks.filter(t => t.id !== task.id).map(t => {
                      const isSafe = validateConnection(t.id, task.id);
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
                    {tasks.filter(t => t.id !== task.id && t.id !== chosenPrevTaskId).map(t => {
                      const isLinkSafe = validateConnection(t.id, task.id);
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
            </div>

            <div className="flex justify-between items-center p-4 border-t bg-gray-50 flex-shrink-0">
              {isAuth ? (
                <button type="button" onClick={() => { if(confirm('消去しますか？')) onDelete(task.id).then(onClose); }} className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                  削除
                </button>
              ) : <div />}
              
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsEditMode(false)} className="px-4 py-2 text-gray-500 text-sm hover:bg-gray-50 rounded-xl transition-colors">キャンセル</button>
                {isAuth && <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-md transition-colors">保存</button>}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};