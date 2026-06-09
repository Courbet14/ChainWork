import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import _Xarrow, { Xwrapper, useXarrow } from 'react-xarrows';
import ReactMarkdown from 'react-markdown'; // 💡 追加: プレビュー用Markdownレンダラー

import { AddFieldForm } from '../components/AddFieldForm';
import { AddTaskForm } from '../components/AddTaskForm';
import { EditTaskModal } from '../components/EditTaskModal';
import { EditRoomModal } from '../components/EditRoomModal';
import { FileTreeEditor } from '../components/FileTreeEditor';
import { PasswordGate } from '../components/PasswordGate';
import { useFormFields } from '../hooks/useFormFields';
import { useTasks } from '../hooks/useTasks';
import { useTaskPages } from '../hooks/useTaskPages';
import { useRoom } from '../hooks/useRoom';
import { useWorkspaceLayout } from '../hooks/useWorkspaceLayout';
import { useChainValidation } from '../hooks/useChainValidation';
import type { Task } from '../types';

const Xarrow = (_Xarrow as any).default || _Xarrow;

export const Workspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateXarrow = useXarrow();

  const { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading: isRoomLoading } = useRoom(id);
  const { pages, selectedPageId, setSelectedPageId, updateItemName, deleteItem, createPage, createFolder, moveItemUp, moveItemDown, moveItemOut, moveItemIn } = useTaskPages(id);
  const { fields } = useFormFields(id);
  const { tasks, addTask, updateTask, deleteTask, isLoading: isTaskLoading } = useTasks(selectedPageId);
  const { positions, canvasHeight, canvasWidth } = useWorkspaceLayout(tasks);
  const { validateConnection } = useChainValidation(tasks);

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | 'HEAD'>('HEAD');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sourceRoomInput, setSourceRoomInput] = useState('');
  
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { updateXarrow(); }, 60);
    return () => clearTimeout(timer);
  }, [tasks, positions, updateXarrow, selectedPageId]);

  if (!id) return <div className="p-6 text-red-500 font-mono">ルームIDが見つかりません。</div>;

  const handleAddFromNode = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInitialParentId(parentId);
    setIsTaskModalOpen(true);
  };

  const handleExecuteClone = async () => {
    if (!sourceRoomInput.trim() || !id) return;
    const ok = await cloneWholeRoom(sourceRoomInput.trim(), id);
    if (ok) {
      setSourceRoomInput('');
      window.location.reload();
    }
  };

  const handleAddChildToTree = async (name: string, isFolder: boolean, parentId: string | null) => {
    if (!id || !name.trim()) return;
    if (isFolder) {
      await createFolder(name.trim(), parentId);
    } else {
      await createPage(name.trim(), parentId);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    if (verifyPassword(passwordInput)) setPasswordInput('');
    else setAuthError(true);
  };

  if (!isRoomLoading && room && !isAuth) {
    return (
      <PasswordGate 
        roomId={id} 
        roomName={room.name} 
        authError={authError} 
        passwordInput={passwordInput} 
        setPasswordInput={setPasswordInput} 
        onSubmit={handleAuthSubmit} 
      />
    );
  }

  return (
    <div className="relative flex h-screen bg-gray-100 overflow-hidden text-gray-800">
      <aside className="w-80 bg-slate-900 text-slate-200 p-4 flex flex-col justify-between border-r border-slate-800 z-20 overflow-hidden">
        <div className="space-y-4 flex flex-col h-full overflow-hidden">
          <div className="border-b border-slate-800 pb-3 flex-shrink-0">
            <h2 className="text-2xl font-black tracking-wider text-white">ChainWork</h2>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-400 font-mono">
              <span>Room ID: {id}</span>
            </div>
            <p className="text-sm font-bold text-blue-400 font-sans mt-1 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-800/50 truncate">
              {room?.name || 'Loading...'}
            </p>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700/80 space-y-2 mb-4 flex-shrink-0">
              <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest">テンプレートをインポート</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="対象ルームID" 
                  value={sourceRoomInput} 
                  onChange={e => setSourceRoomInput(e.target.value)} 
                  className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none" 
                />
                <button type="button" onClick={handleExecuteClone} disabled={isRoomLoading || !sourceRoomInput.trim()} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 rounded-lg font-bold shadow-md transition-colors flex-shrink-0">
                  複製
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <FileTreeEditor 
                pages={pages}
                selectedPageId={selectedPageId}
                setSelectedPageId={setSelectedPageId}
                onRename={updateItemName}
                onDelete={deleteItem}
                onAddChild={handleAddChildToTree}
                onMoveUp={moveItemUp}
                onMoveDown={moveItemDown}
                onMoveOut={moveItemOut}
                onMoveIn={moveItemIn}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 flex-shrink-0">
          <button onClick={() => setIsRoomModalOpen(true)} className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all shadow-sm">
            環境設定
          </button>
          <button onClick={() => setIsFieldModalOpen(true)} className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all shadow-sm">
            カスタム項目
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">{pages.find(p => p.id === selectedPageId)?.name || 'ワークスペース'}</h2>
            
            {room && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-100 select-none transition-all shadow-xs">
                  <input 
                    type="checkbox" 
                    checked={room.is_copyable} 
                    onChange={e => toggleCopyable(e.target.checked)} 
                    className="rounded text-blue-600 w-3.5 h-3.5 focus:ring-0 cursor-pointer" 
                  />
                  <span className={`font-bold transition-colors ${room.is_copyable ? 'text-green-600' : 'text-gray-400'}`}>
                    {room.is_copyable ? '複製許可：有効' : '複製許可：無効'}
                  </span>
                </label>

                <button
                  onClick={() => navigate(`/workspace/${id}/share`)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  共有リンクの発行
                </button>
              </div>
            )}
          </div>
          {selectedPageId && (
            <button onClick={() => { setInitialParentId(tasks.length > 0 ? tasks[0].id : 'HEAD'); setIsTaskModalOpen(true); }} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-xl text-sm shadow-sm hover:bg-blue-700">
              タスクを追加
            </button>
          )}
        </header>

        <main className="flex-grow p-6 overflow-auto bg-gray-50">
          <div className="bg-white p-6 rounded-2xl shadow-sm border min-h-full">
            {!selectedPageId ? (
              <div className="text-center py-24 text-gray-400 text-sm">サイドバーからページを選択するか、新しく作成してください。</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed rounded-xl">
                <p className="text-gray-400 text-sm mb-3">このページにはまだタスクがありません</p>
                <button onClick={() => { setInitialParentId('HEAD'); setIsTaskModalOpen(true); }} className="text-blue-600 font-bold text-sm">ルートタスクを作成する</button>
              </div>
            ) : (
              <Xwrapper>
                <div className="relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
                  {tasks.map((task) => {
                    const pos = positions[task.id] || { x: 100, y: 40 };
                    const taskStatus = task.metadata.status || '未着手';
                    let styles = { border: 'border-gray-200', bg: 'bg-white', bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' };
                    if (taskStatus === '着手中') styles = { border: 'border-amber-200', bg: 'bg-amber-50/40', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' };
                    if (taskStatus === '終了') styles = { border: 'border-emerald-200', bg: 'bg-emerald-50/30', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };

                    return (
                      <div 
                        key={task.id} 
                        id={`task-${task.id}`} 
                        onClick={() => setEditingTask(task)}
                        className={`absolute w-40 aspect-square ${styles.border} ${styles.bg} border rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group z-10 cursor-pointer`} 
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${styles.bar}`} />
                        <div className="p-3 pt-4 flex-shrink-0">
                          <div className="text-[10px] text-gray-500 font-mono mb-1 bg-gray-100/80 px-1 py-0.5 rounded text-center truncate">{task.start_date && task.end_date ? `${task.start_date.substring(5)} - ${task.end_date.substring(5)}` : '期間未定'}</div>
                          <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{task.title}</h4>
                        </div>
                        
                        <div className="px-3 flex-1 overflow-y-hidden relative space-y-1">
                          {Object.entries(task.metadata).map(([k, v]) => {
                            if (k === 'merged_task_ids' || k === 'status' || k === 'memo') return null;
                            if (v === '' || v === null || v === undefined) return null;

                            const f = fields.find(fd => fd.field_key === k);
                            return (
                              <div key={k} className="text-[9px] bg-white/80 px-1.5 py-0.5 rounded border flex justify-between items-center shadow-xs">
                                <span className="text-gray-400 truncate w-12">{f?.label || k}</span>
                                <span className="text-gray-700 font-bold truncate max-w-[50%]">{String(v)}</span>
                              </div>
                            );
                          })}

                          {/* 💡 変更: プレビュー用のコンパクトなMarkdownレンダラー */}
                          {task.metadata.memo && (
                            <div className="relative text-[9px] bg-slate-50 px-1.5 py-1 rounded border border-slate-200 text-slate-500 shadow-xs mt-1 overflow-hidden max-h-12 leading-tight">
                              <ReactMarkdown
                                components={{
                                  p: ({node, ...props}) => <p className="mb-0.5 last:mb-0" {...props} />,
                                  h1: ({node, ...props}) => <strong className="block text-[10px] text-slate-700 mb-0.5" {...props} />,
                                  h2: ({node, ...props}) => <strong className="block text-[10px] text-slate-700 mb-0.5" {...props} />,
                                  h3: ({node, ...props}) => <strong className="block text-[10px] text-slate-700 mb-0.5" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-3 mb-0.5 space-y-0.5" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal pl-3 mb-0.5 space-y-0.5" {...props} />,
                                  li: ({node, ...props}) => <li className="pl-0.5" {...props} />,
                                  code: ({node, className, ...props}) => {
                                    const isInline = !className?.includes('language-');
                                    return isInline 
                                      ? <code className="bg-slate-200 text-pink-600 px-1 py-0.5 rounded text-[8px] font-mono" {...props} />
                                      : <code className="block bg-slate-800 text-slate-50 p-1 rounded-sm text-[8px] font-mono overflow-hidden whitespace-pre-wrap mt-0.5" {...props} />;
                                  },
                                  pre: ({node, ref, ...props}: any) => <div className="m-0" {...props} />,
                                  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-slate-300 pl-1.5 text-slate-400 italic mb-0.5" {...props} />
                                }}
                              >
                                {task.metadata.memo}
                              </ReactMarkdown>
                              
                              {/* 📝 下部をグラデーションでフェードアウトさせて省略を表現 */}
                              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none rounded-b" />
                            </div>
                          )}
                        </div>

                        <div className="p-2 border-t bg-gray-50/50 rounded-b-2xl flex justify-between items-center text-[11px] text-gray-500 flex-shrink-0">
                          <span className="truncate max-w-[60%]">{task.assignee || '未設定'}</span>
                          <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] scale-95 ${styles.badge}`}>{taskStatus}</span>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={(e) => handleAddFromNode(task.id, e)} 
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all font-bold shadow-md z-30"
                        >
                          ＋
                        </button>
                      </div>
                    );
                  })}

                  {tasks.map((task) => {
                    const arrows = [];
                    if (task.prev_task_id) arrows.push(<Xarrow key={`main-${task.prev_task_id}-${task.id}`} start={`task-${task.prev_task_id}`} end={`task-${task.id}`} color="#475569" strokeWidth={2} path="grid" gridRadius={4} showHead={true} startAnchor="bottom" endAnchor="top" />);
                    const mIds = task.metadata.merged_task_ids;
                    if (mIds && Array.isArray(mIds)) {
                      mIds.forEach(mId => { arrows.push(<Xarrow key={`merge-${mId}-${task.id}`} start={`task-${mId}`} end={`task-${task.id}`} color="#475569" strokeWidth={2} path="grid" gridRadius={4} showHead={true} startAnchor="bottom" endAnchor="top" />); });
                    }
                    return arrows;
                  })}
                </div>
              </Xwrapper>
            )}
          </div>
        </main>
      </div>

      <EditRoomModal room={room} isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} onUpdateRoom={updateRoom} />
      <AddFieldForm roomId={id} isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} />
      
      <AddTaskForm 
        roomId={id} 
        formFields={fields} 
        tasks={tasks} 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        validateConnection={validateConnection}
        onSubmit={async (title, assignee, start, end, meta, prevId) => {
          if (!validateConnection(prevId, null)) { alert('循環参照が検知されました'); return; }
          await addTask({ roomId: id, title, assignee, startDate: start, endDate: end, metadata: meta, chosenPrevTaskId: prevId });
        }} 
        initialParentId={initialParentId} 
        isLoading={isTaskLoading} 
      />

      <EditTaskModal 
        task={editingTask} 
        formFields={fields} 
        tasks={tasks} 
        isOpen={editingTask !== null} 
        isAuth={isAuth} 
        onClose={() => setEditingTask(null)} 
        validateConnection={validateConnection}
        onUpdate={async (taskId, fieldsToUpdate) => {
          if ('prev_task_id' in fieldsToUpdate && !validateConnection(fieldsToUpdate.prev_task_id, taskId)) return;
          await updateTask(taskId, fieldsToUpdate);
        }} 
        onDelete={deleteTask} 
      />
    </div>
  );
};