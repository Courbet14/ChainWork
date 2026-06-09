import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { FormField, Task, TaskStatus, TaskMetadata } from '../types';

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
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [chosenPrevTaskId, setChosenPrevTaskId] = useState<string | 'HEAD'>('HEAD');
  const [mergedTaskIds, setMergedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && task) {
      setIsEditMode(false);

      setTitle(task.title || '');
      setAssignee(task.assignee || '');
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      setChosenPrevTaskId(task.prev_task_id || 'HEAD');
      
      const meta = task.metadata;
      setMergedTaskIds(meta.merged_task_ids || []);
      setStatus(meta.status || '未着手');
      setMemo(meta.memo || '');

      const currentCustomMeta: Record<string, any> = {};
      formFields.forEach(f => {
        currentCustomMeta[f.field_key] = meta[f.field_key] ?? (f.field_type === 'color' ? '#c7d2fe' : '');
      });
      setCustomMetadata(currentCustomMeta);
    }
  }, [isOpen, task, formFields]);

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
    if (!isAuth || !title.trim()) return;

    const finalMetadata: TaskMetadata = {
      ...customMetadata,
      status,
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(mergedTaskIds.length > 0 ? { merged_task_ids: mergedTaskIds } : {})
    };

    await onUpdate(task.id, {
      title,
      assignee: assignee || null,
      start_date: startDate || null,
      end_date: endDate || null,
      prev_task_id: chosenPrevTaskId === 'HEAD' ? null : chosenPrevTaskId,
      metadata: finalMetadata
    });
    setIsEditMode(false);
  };

  const validParentCandidates = tasks.filter(t => t.id !== task.id && t.prev_task_id !== task.id);
  const availableMergeTasks = validParentCandidates.filter(t => t.id !== chosenPrevTaskId);

  const parentTaskName = chosenPrevTaskId !== 'HEAD' ? tasks.find(t => t.id === chosenPrevTaskId)?.title : 'ルートノード';
  const mergedTaskNames = mergedTaskIds.map(id => tasks.find(t => t.id === id)?.title).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        
        {/* =========================================
            モードA: 閲覧（詳細表示）モード
        ========================================= */}
        {!isEditMode ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-2xl font-black text-gray-800 leading-snug break-words">{title}</h3>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm
                ${status === '未着手' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                  status === '着手中' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                {status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-100 text-sm">
              <div>
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mb-1">担当者</span>
                <span className="font-medium text-gray-800">{assignee || '未設定'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mb-1">期間</span>
                <span className="font-mono text-gray-700">{startDate || '未定'} 〜 {endDate || '未定'}</span>
              </div>
            </div>

            {/* 💡 変更：Markdownのレンダリング部分 */}
            {memo && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">メモ</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-800 leading-relaxed overflow-x-auto">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2 border-b pb-1 text-slate-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2 text-slate-800" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold mt-2 mb-1 text-slate-800" {...props} />,
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-500 my-3" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-xs font-mono overflow-x-auto my-3 shadow-inner" {...props} />,
                      code: ({node, className, ...props}) => {
                        const isInline = !className?.includes('language-');
                        return isInline 
                          ? <code className="bg-slate-200 text-pink-600 px-1.5 py-0.5 rounded text-[11px] font-mono" {...props} />
                          : <code className={className} {...props} />;
                      }
                    }}
                  >
                    {memo}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {formFields.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">カスタム項目</h4>
                <div className="grid grid-cols-2 gap-3">
                  {formFields.map(f => {
                    const val = customMetadata[f.field_key];
                    if (val === '' || val === undefined || val === null) return null;
                    return (
                      <div key={f.id} className="bg-white border border-gray-100 px-3 py-2 rounded-lg shadow-sm flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold mb-0.5">{f.label}</span>
                        <span className="text-sm font-medium text-gray-800 truncate">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">依存関係</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium shadow-sm">
                  <span className="opacity-60">先行:</span> {parentTaskName}
                </span>
                {mergedTaskNames.map((mName, i) => (
                  <span key={i} className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium shadow-sm">
                    <span className="opacity-60">合流:</span> {mName}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <button onClick={onClose} className="px-5 py-2 text-gray-500 font-medium text-sm hover:bg-gray-50 rounded-xl transition-colors">
                閉じる
              </button>
              {isAuth && (
                <button 
                  onClick={() => setIsEditMode(true)} 
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all shadow-md flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  編集する
                </button>
              )}
            </div>
          </div>
        ) : (
          
        /* =========================================
            モードB: 編集フォームモード
        ========================================= */
          <div className="animate-in slide-in-from-right-4 fade-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-blue-600">✎</span> タスクの編集
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <fieldset disabled={!isAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-blue-600 mb-1">先行タスクの変更</label>
                  <select value={chosenPrevTaskId} onChange={e => { setChosenPrevTaskId(e.target.value); setMergedTaskIds(prev => prev.filter(id => id !== e.target.value)); }} className="w-full p-2 border border-blue-100 rounded-lg text-sm bg-blue-50/50">
                    <option value="HEAD">ルートノードに設定</option>
                    {validParentCandidates.map(t => {
                      const isSafe = validateConnection(t.id, task.id);
                      return (
                        <option key={t.id} value={t.id} disabled={!isSafe}>
                          {t.title} {!isSafe && '(循環参照エラーのため選択不可)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">ステータス</label>
                  <div className="flex gap-2">
                    {(['未着手', '着手中', '終了'] as TaskStatus[]).map(s => (
                      <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 py-2 text-xs font-bold border rounded-xl shadow-sm transition-all ${status === s ? 'bg-slate-700 text-white' : 'bg-gray-50 text-gray-500'}`}>{s}</button>
                    ))}
                  </div>
                </div>

                {availableMergeTasks.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg border text-sm">
                    <label className="block text-xs font-bold text-slate-700 mb-1">依存関係（合流）の追加</label>
                    <div className="max-h-24 overflow-y-auto flex flex-col gap-1 bg-white p-2 rounded">
                      {availableMergeTasks.map(t => {
                        const isLinkSafe = validateConnection(t.id, task.id);
                        return (
                          <label 
                            key={t.id} 
                            className={`flex items-center gap-2 p-0.5 rounded transition-colors 
                              ${!isLinkSafe ? 'opacity-40 bg-red-50 text-red-700 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={mergedTaskIds.includes(t.id)} 
                              onChange={() => isLinkSafe && handleMergeToggle(t.id)} 
                              disabled={!isLinkSafe} 
                              className="rounded text-blue-600" 
                            />
                            <span className="font-medium">
                              {t.title} {!isLinkSafe && <span className="text-[10px] font-bold text-red-500">(循環参照リスク)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">タスク名</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">担当者</label>
                    <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">開始日</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">終了日</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1 flex justify-between">
                      <span>メモ</span>
                      <span className="text-gray-400 font-mono text-[10px]">Markdown記法に対応しています</span>
                    </label>
                    <textarea 
                      value={memo} 
                      onChange={e => setMemo(e.target.value)} 
                      rows={5} 
                      placeholder="# 見出し\n- リスト1\n- リスト2\n\n```\nconst code = 'hello';\n
```"
                      className="w-full p-3 border rounded-lg bg-gray-50/50 text-sm resize-y font-mono" 
                    />
                  </div>
                </div>

                {formFields.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">カスタム項目</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formFields.map(f => (
                        <div key={f.id}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                          <input type={f.field_type} value={customMetadata[f.field_key] ?? ''} onChange={e => handleCustomFieldChange(f.field_key, e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </fieldset>

              <div className="flex justify-between items-center pt-4 border-t mt-6">
                {isAuth ? <button type="button" onClick={() => { if(confirm('消去しますか？')) onDelete(task.id).then(onClose); }} className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors">削除</button> : <div />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsEditMode(false)} className="px-4 py-2 text-gray-500 text-sm hover:bg-gray-50 rounded-xl transition-colors">キャンセル</button>
                  {isAuth && <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-md transition-colors">保存</button>}
                </div>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};