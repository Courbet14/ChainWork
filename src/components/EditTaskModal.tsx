import { useState, useEffect } from 'react';
import type { FormField, Task, TaskStatus, TaskMetadata } from '../types';

type Props = {
  task: Task | null;
  formFields: FormField[];
  tasks: Task[];
  isOpen: boolean;
  isAuth: boolean;
  onClose: () => void;
  // 💡 フックベースの検証関数のProps定義
  validateConnection: (targetPrevId: string | 'HEAD' | null, currentTaskId: string | null) => boolean;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export const EditTaskModal = ({ task, formFields, tasks, isOpen, isAuth, onClose, validateConnection, onUpdate, onDelete }: Props) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('未着手');
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
      
      const meta = task.metadata;
      setMergedTaskIds(meta.merged_task_ids || []);
      setStatus(meta.status || '未着手');

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
    onClose();
  };

  const validParentCandidates = tasks.filter(t => t.id !== task.id && t.prev_task_id !== task.id);
  const availableMergeTasks = validParentCandidates.filter(t => t.id !== chosenPrevTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🛠️ 詳細編集 / 収束・属性変更 {!isAuth && '🔒 (閲覧専用)'}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <fieldset disabled={!isAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-600 mb-1">🔀 メインの親接続先（変更）</label>
              <select value={chosenPrevTaskId} onChange={e => { setChosenPrevTaskId(e.target.value); setMergedTaskIds(prev => prev.filter(id => id !== e.target.value)); }} className="w-full p-2 border border-blue-100 rounded-lg text-sm bg-blue-50/50">
                <option value="HEAD">先頭ノード（親なし）</option>
                {validParentCandidates.map(t => {
                  const isSafe = validateConnection(t.id, task.id); // 💡 メイン親の安全判定
                  return (
                    <option key={t.id} value={t.id} disabled={!isSafe}>
                      {t.title} {!isSafe && '⚠️ (循環ループエラーのため選択不可)'}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">📊 進捗ステータス</label>
              <div className="flex gap-2">
                {(['未着手', '着手中', '終了'] as TaskStatus[]).map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 py-2 text-xs font-bold border rounded-xl shadow-sm transition-all ${status === s ? 'bg-slate-700 text-white' : 'bg-gray-50 text-gray-500'}`}>{s}</button>
                ))}
              </div>
            </div>

            {/* 複数タスクからのマージ（収束）編集領域 */}
            {availableMergeTasks.length > 0 && (
              <div className="bg-purple-50 p-3 rounded-lg border text-sm">
                <label className="block text-xs font-bold text-purple-600 mb-1">🔀 合流元のタスクを追加・変更（収束ライン）</label>
                <div className="max-h-24 overflow-y-auto flex flex-col gap-1 bg-white p-2 rounded">
                  {availableMergeTasks.map(t => {
                    const isLinkSafe = validateConnection(t.id, task.id); // 💡 マージのリアルタイム判定
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
                          className="rounded text-purple-600" 
                        />
                        <span className="font-medium">
                          {t.title} {!isLinkSafe && <span className="text-[10px] font-bold text-red-500">(⚠️ 循環参照リスク)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="p-2 border rounded-lg text-sm" placeholder="タスク名" required />
              <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} className="p-2 border rounded-lg text-sm" placeholder="担当者" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-lg text-sm" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-lg text-sm" />
            </div>

            {formFields.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">カスタム項目を編集</h4>
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

          <div className="flex justify-between items-center pt-4 border-t">
            {isAuth ? <button type="button" onClick={() => { if(confirm('消去しますか？')) onDelete(task.id).then(onClose); }} className="text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-bold">🗑️ 削除</button> : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 text-sm">閉じる</button>
              {isAuth && <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg text-sm">変更を保存</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};