import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import _Xarrow, { Xwrapper, useXarrow } from 'react-xarrows';
import { AddFieldForm } from '../features/workspace/components/AddFieldForm';
import { AddTaskForm } from '../features/workspace/components/AddTaskForm';
import { EditTaskModal } from '../features/workspace/components/EditTaskModal';
import { useFormFields } from '../features/workspace/hooks/useFormFields';
import { useTasks, type Task } from '../features/workspace/hooks/useTasks';
import { useTaskPages } from '../features/workspace/hooks/useTaskPages';
import { useWorkspaceLayout } from '../features/workspace/hooks/useWorkspaceLayout';

const Xarrow = (_Xarrow as any).default || _Xarrow;

export const Workspace = () => {
  const { id } = useParams<{ id: string }>();
  
  const { pages, selectedPageId, setSelectedPageId, createPage } = useTaskPages(id);
  const { fields } = useFormFields(id);
  
  const { tasks, addTask, updateTask, deleteTask, isLoading: isTaskLoading } = useTasks(selectedPageId);
  const { positions, canvasHeight, canvasWidth } = useWorkspaceLayout(tasks);

  const updateXarrow = useXarrow();

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | 'HEAD'>('HEAD');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newPageName, setNewPageName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { updateXarrow(); }, 60);
    return () => clearTimeout(timer);
  }, [tasks, positions, updateXarrow, selectedPageId]);

  if (!id) return <div className="p-6 text-red-500">ルームIDが見つかりません。</div>;

  const handleAddFromNode = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInitialParentId(parentId);
    setIsTaskModalOpen(true);
  };

  const handleAddNewTask = () => {
    setInitialParentId(tasks.length > 0 ? tasks[0].id : 'HEAD');
    setIsTaskModalOpen(true);
  };

  const handleCreatePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    createPage(newPageName.trim());
    setNewPageName('');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* 📁 サイドバー */}
      <aside className="w-64 bg-slate-900 text-slate-200 p-5 flex flex-col justify-between border-r border-slate-800 z-20">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black tracking-wider text-white">ChainWork</h2>
            <p className="text-xs text-slate-400 font-mono mt-1">Room: {id}</p>
          </div>

          <form onSubmit={handleCreatePageSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="+ 新しいページ名"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>

          <div className="space-y-1 overflow-y-auto max-h-[50vh]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">📁 ワークスペース一覧</label>
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                  ${selectedPageId === page.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                📄 {page.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setIsFieldModalOpen(true)} className="w-full py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors">
          ⚙️ カスタム項目を拡張
        </button>
      </aside>

      {/* 🌲 メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">
            {pages.find(p => p.id === selectedPageId)?.name || '読み込み中...'}
          </h2>
          <button
            onClick={handleAddNewTask}
            disabled={!selectedPageId}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-sm shadow-sm disabled:opacity-50 transition-all"
          >
            🚀 タスクを追加
          </button>
        </header>

        <main className="flex-grow p-6 overflow-auto bg-gray-50">
          <AddFieldForm roomId={id} isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} />
          
          <AddTaskForm 
            roomId={id} 
            formFields={fields} 
            tasks={tasks} 
            isOpen={isTaskModalOpen} 
            onClose={() => setIsTaskModalOpen(false)} 
            onSubmit={(title, assignee, start, end, meta, prevId) => 
              addTask({ roomId: id, title, assignee, startDate: start, endDate: end, metadata: meta, chosenPrevTaskId: prevId })
            } 
            initialParentId={initialParentId}
            isLoading={isTaskLoading}
          />

          <EditTaskModal 
            roomId={id} 
            task={editingTask} 
            formFields={fields} 
            tasks={tasks} 
            isOpen={editingTask !== null} 
            onClose={() => setEditingTask(null)} 
            onUpdate={updateTask}
            onDelete={deleteTask}
          />

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-full">
            {!selectedPageId ? (
              <div className="text-center py-24 text-gray-400 text-sm">左のサイドバーからページを作成してください。</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400 text-sm mb-3">このページにはまだ起源ノードがありません</p>
                <button onClick={handleAddNewTask} className="text-blue-600 font-bold text-sm">最初のルートタスクを作る &rarr;</button>
              </div>
            ) : (
              <Xwrapper>
                <div className="relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
                  
                  {tasks.map((task) => {
                    const pos = positions[task.id] || { x: 100, y: 40 };
                    const taskStatus = task.metadata.status || '未着手';
                    
                    let statusStyles = {
                      border: 'border-gray-200', bg: 'bg-white', bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600'
                    };

                    if (taskStatus === '着手中') {
                      statusStyles = { border: 'border-amber-200', bg: 'bg-amber-50/40', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' };
                    } else if (taskStatus === '終了') {
                      statusStyles = { border: 'border-emerald-200', bg: 'bg-emerald-50/30', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };
                    }

                    const formatPeriod = () => {
                      if (!task.start_date && !task.end_date) return '期間未定';
                      const start = task.start_date ? task.start_date.replace(/^\d{4}-/, '') : '未定';
                      const end = task.end_date ? task.end_date.replace(/^\d{4}-/, '') : '未定';
                      return `${start} ➔ ${end}`;
                    };

                    return (
                      <div
                        key={task.id}
                        id={`task-${task.id}`}
                        onClick={() => setEditingTask(task)}
                        className={`absolute w-40 aspect-square ${statusStyles.border} ${statusStyles.bg} border rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group z-10 cursor-pointer`}
                        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${statusStyles.bar}`} />
                        
                        <div className="p-3 pt-4">
                          <div className="text-[10px] text-gray-500 font-mono mb-1 bg-gray-100/80 px-1 py-0.5 rounded text-center truncate">
                            📅 {formatPeriod()}
                          </div>
                          <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{task.title}</h4>
                        </div>

                        <div className="px-3 flex-1 overflow-y-auto space-y-1">
                          {Object.entries(task.metadata).map(([key, value]) => {
                            if (key === 'merged_task_ids' || key === 'status') return null;
                            const fieldDef = fields.find((f) => f.field_key === key);
                            return (
                              <div key={key} className="text-[9px] bg-white/80 px-1.5 py-0.5 rounded border border-gray-100 flex justify-between items-center shadow-xs">
                                <span className="text-gray-400 truncate w-10">{fieldDef?.label || key}</span>
                                <span className="text-gray-700 font-bold truncate max-w-[50%]">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center text-[11px] text-gray-500">
                          <span className="truncate max-w-[60%]">👤 {task.assignee || '未設定'}</span>
                          <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] scale-95 ${statusStyles.badge}`}>
                            {taskStatus}
                          </span>
                        </div>

                        <button onClick={(e) => handleAddFromNode(task.id, e)} className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all font-bold text-sm shadow-md z-20">＋</button>
                      </div>
                    );
                  })}

                  {/* 🎯 矢印の一括描画 */}
                  {tasks.map((task) => {
                    const arrows = [];
                    if (task.prev_task_id) {
                      arrows.push(
                        <Xarrow key={`main-${task.prev_task_id}-${task.id}`} start={`task-${task.prev_task_id}`} end={`task-${task.id}`} color="#475569" strokeWidth={2} path="grid" gridRadius={4} showHead={true} startAnchor="bottom" endAnchor="top" />
                      );
                    }
                    
                    // 💡 安全かつ厳格に、定義された型に基づいて merged_task_ids を取り出し
                    const mergedIds = task.metadata.merged_task_ids;
                    
                    if (mergedIds && Array.isArray(mergedIds)) {
                      mergedIds.forEach((mergedId) => {
                        arrows.push(
                          <Xarrow key={`merge-${mergedId}-${task.id}`} start={`task-${mergedId}`} end={`task-${task.id}`} color="#475569" strokeWidth={2} path="grid" gridRadius={4} showHead={true} startAnchor="bottom" endAnchor="top" />
                        );
                      });
                    }
                    return arrows;
                  })}

                </div>
              </Xwrapper>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};