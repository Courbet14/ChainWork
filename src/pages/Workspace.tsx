import { useState } from 'react';
import { useParams } from 'react-router-dom';
import _Xarrow, { Xwrapper } from 'react-xarrows';
import { AddFieldForm } from '../features/workspace/components/AddFieldForm';
import { AddTaskForm } from '../features/workspace/components/AddTaskForm';
import { useFormFields } from '../features/workspace/hooks/useFormFields';
import { useTasks } from '../features/workspace/hooks/useTasks';
import { useWorkspaceLayout } from '../features/workspace/hooks/useWorkspaceLayout'; // ★ 新しいフックをインポート

const Xarrow = (_Xarrow as any).default || _Xarrow;

export const Workspace = () => {
  const { id } = useParams<{ id: string }>();
  
  // 3つのカスタムフックから宣言的に状態を切り出す
  const { fields } = useFormFields(id);
  const { tasks } = useTasks(id);
  const { positions, canvasHeight, canvasWidth } = useWorkspaceLayout(tasks);

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | 'HEAD'>('HEAD');

  if (!id) return <div className="p-6 text-red-500">ルームIDが見つかりません。</div>;

  const handleAddFromNode = (parentId: string) => {
    setInitialParentId(parentId);
    setIsTaskModalOpen(true);
  };

  const handleAddNewTask = () => {
    setInitialParentId('HEAD');
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      
      {/* ヘッダー */}
      <header className="max-w-5xl mx-auto mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ChainWork Board</h1>
          <p className="text-sm text-gray-500 mt-1">🔑 Room: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">{id}</code></p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => setIsFieldModalOpen(true)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl shadow-sm text-sm">
            ⚙️ フォームを拡張
          </button>
          <button onClick={handleAddNewTask} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-sm">
            🚀 新規タスク
          </button>
        </div>
      </header>

      {/* メインボード */}
      <main className="max-w-6xl mx-auto space-y-8">
        <AddFieldForm roomId={id} isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} />
        
        <AddTaskForm 
          roomId={id} 
          formFields={fields} 
          tasks={tasks}
          isOpen={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)} 
          initialParentId={initialParentId}
        />

        // Workspace.tsx の主要な変更箇所（return 内のキャンバス描画部分）

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-auto min-h-[600px]">
          <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2">📐 UMLスタイル・幾何学収束ツリー</h3>
          
          {tasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <button onClick={handleAddNewTask} className="text-blue-600 hover:text-blue-700 font-bold text-sm">最初のタスクを作る &rarr;</button>
            </div>
          ) : (
            <Xwrapper>
              {/* 💡 横幅（canvasWidth）もフックから受け取った値で動的に広げる */}
              <div className="relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
                
                {/* 🟩 タスクカードのレンダリング（以前のままでOK） */}
                {tasks.map((task) => {
                  const pos = positions[task.id] || { x: 100, y: 40 };
                  return (
                    <div
                      key={task.id}
                      id={`task-${task.id}`}
                      className="absolute w-40 aspect-square bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group z-10"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    >
                      {/* ...カードの中身のコード（省略・変更なし）... */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-blue-500" />
                      <div className="p-3 pt-4">
                        <div className="text-[10px] text-gray-400 font-mono mb-1 leading-none">{task.start_date ? task.start_date.replace(/^\d{4}-/, '') : '未定'}</div>
                        <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{task.title}</h4>
                      </div>
                      <div className="px-3 flex-1 overflow-y-auto space-y-1">
                        {Object.entries(task.metadata).map(([key, value]) => {
                          if (key === 'merged_task_ids') return null;
                          const fieldDef = fields.find((f) => f.field_key === key);
                          return (
                            <div key={key} className="text-[9px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex justify-between items-center">
                              <span className="text-gray-400 truncate w-10">{fieldDef?.label || key}</span>
                              <span className="text-gray-700 font-bold truncate max-w-[50%]">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center text-xs text-gray-500">
                        <span className="truncate">👤 {task.assignee || '未設定'}</span>
                      </div>
                      <button onClick={() => handleAddFromNode(task.id)} className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 text-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all z-20 font-bold text-sm">＋</button>
                    </div>
                  );
                })}

                {/* 🎯 矢印の一ッ括描画（ここをUML風の「grid」に変更！） */}
                {tasks.map((task) => {
                  const arrows = [];

                  // 1. メインの親子関係（青色のカクカク矢印）
                  if (task.prev_task_id) {
                    arrows.push(
                     <Xarrow
                        key={`main-${task.prev_task_id}-${task.id}`}
                        start={`task-${task.prev_task_id}`}
                        end={`task-${task.id}`}
                        color="#475569"       // ★ プロフェッショナルなスレートグレーに統一
                        strokeWidth={2}
                        path="grid"
                        gridRadius={4}
                        showHead={true}
                        startAnchor="bottom" // ★ 必ず「下」から出る
                        endAnchor="top"    // ★ 必ず「上」に入る
                    />
                    );
                  }

                  // 2. 複数の親からの合流（エメラルドグリーンのカクカク矢印）
                  const mergedIds = task.metadata.merged_task_ids as string[] | undefined;
                  if (mergedIds && Array.isArray(mergedIds)) {
                    mergedIds.forEach((mergedId) => {
                      arrows.push(
                       <Xarrow
                            key={`merge-${mergedId}-${task.id}`}
                            start={`task-${mergedId}`}
                            end={`task-${task.id}`}
                            color="#475569"       // ★ メインと同じ色に統一
                            strokeWidth={2}
                            path="grid"
                            gridRadius={4}
                            showHead={true}
                            startAnchor="bottom" // ★ 同じく「下」から出る
                            endAnchor="top"
                         />
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
  );
};