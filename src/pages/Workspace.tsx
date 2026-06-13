import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useXarrow } from 'react-xarrows';

// 📚 フックのインポート
import { useRoom } from '../hooks/useRoom';
import { useTaskPages } from '../hooks/useTaskPages';
import { useFormFields } from '../hooks/useFormFields';
import { useTasks } from '../hooks/useTasks';
import { useWorkspaceLayout } from '../hooks/useWorkspaceLayout';
import { useChainValidation } from '../hooks/useChainValidation';
import { useTaskImport } from '../hooks/useTaskImport';
import { useCriticalPath } from '../hooks/useCriticalPath';

// 🧩 モーダル・ゲートコンポーネント
import { AddFieldForm } from '../components/AddFieldForm';
import { AddTaskForm } from '../components/AddTaskForm';
import { EditTaskModal } from '../components/EditTaskModal';
import { EditRoomModal } from '../components/EditRoomModal';
import { PasswordGate } from '../components/PasswordGate';
import { TaskImportModal } from '../components/TaskImportModal';
import { StatisticsModal } from '../components/StatisticsModal';

// 🧩 新規作成したワークスペース専用コンポーネント
import { WorkspaceSidebar } from '../components/WorkspaceSidebar';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { WorkspaceDashboard } from '../components/WorkspaceDashboard';
import { WorkspaceCanvas } from '../components/WorkspaceCanvas';
import { TerminalConsole } from '../components/TerminalConsole';

import type { Task } from '../types';

export const Workspace = () => {
  const { id } = useParams<{ id: string }>();
  const updateXarrow = useXarrow();

  // --- 🎣 カスタムフックの呼び出し ---
  const { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading: isRoomLoading } = useRoom(id);
  const { pages, selectedPageId, setSelectedPageId, updateItemName, deleteItem, createPage, createFolder, createLink, moveItemUp, moveItemDown, moveItemOut, moveItemIn } = useTaskPages(id);
  const { fields } = useFormFields(id);
  const { tasks, addTask, updateTask, deleteTask, isLoading: isTaskLoading } = useTasks(selectedPageId);
  const { positions, canvasHeight, canvasWidth } = useWorkspaceLayout(tasks);
  const { validateConnection } = useChainValidation(tasks);
  
  // --- 📦 ローカルステート（UI開閉制御） ---
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  const [initialParentId, setInitialParentId] = useState<string | 'HEAD'>('HEAD');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sourceRoomInput, setSourceRoomInput] = useState('');
  
  // 🔒 パスワード認証用ステート
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // 📄 ページとルームのID特定
  const activePage = pages.find(p => p.id === selectedPageId);
  const activeRoomId = activePage ? activePage.room_id : id;

  const { criticalPathIds } = useCriticalPath(tasks);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // 💡 --- JSON一括インポート用カスタムフックの呼び出し -//
  
  const {
    isImportModalOpen,
    jsonInput,
    setJsonInput,
    importStatus,
    handleImportJSON,
    openModal: openImportModal,
    closeModal: closeImportModal
  } = useTaskImport(activeRoomId, selectedPageId, () => {
    window.location.reload(); 
  });

  // 🔄 Xarrowの再描画トラッキング
  useEffect(() => {
    const timer = setTimeout(() => { updateXarrow(); }, 60);
    return () => clearTimeout(timer);
  }, [tasks, positions, updateXarrow, selectedPageId]);

  if (!id) return <div className="p-6 text-red-500 font-mono">ルームIDが見つかりません。</div>;

  // --- ⚡ イベントハンドラ ---
  const handleExecuteClone = async () => {
    if (!sourceRoomInput.trim() || !id) return;
    const ok = await cloneWholeRoom(sourceRoomInput.trim(), id);
    if (ok) { setSourceRoomInput(''); window.location.reload(); }
  };

  const handleAddChildToTree = async (name: string, isFolder: boolean, parentId: string | null) => {
    if (!id || !name.trim()) return;
    if (isFolder) await createFolder(name.trim(), parentId);
    else await createPage(name.trim(), parentId);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    const success = await verifyPassword(passwordInput);
    if (success) setPasswordInput(''); else setAuthError(true);
  };

  // 🚪 認証ゲートの表示判定
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

  // 🎨 メインレンダリング
  return (
    <div className="relative flex h-screen bg-gray-100 overflow-hidden text-gray-800">
      
      {/* 1. 左サイドバー */}
      <WorkspaceSidebar 
        roomId={id} room={room} pages={pages} selectedPageId={selectedPageId} setSelectedPageId={setSelectedPageId}
        sourceRoomInput={sourceRoomInput} setSourceRoomInput={setSourceRoomInput} onExecuteClone={handleExecuteClone}
        isRoomLoading={isRoomLoading} onRenamePage={updateItemName} onDeletePage={deleteItem} onAddPage={handleAddChildToTree}
        onAddLink={createLink}
        onMoveUp={moveItemUp} onMoveDown={moveItemDown} onMoveOut={moveItemOut} onMoveIn={moveItemIn}
        openRoomModal={() => setIsRoomModalOpen(true)} openFieldModal={() => setIsFieldModalOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* 2. ヘッダー */}
        <WorkspaceHeader 
          roomId={id} room={room} pages={pages} selectedPageId={selectedPageId} tasks={tasks}
          toggleCopyable={toggleCopyable}
          onAddTask={(parentId) => { setInitialParentId(parentId); setIsTaskModalOpen(true); }} 
        />
        
        {/* 3. メインキャンバス */}
        <main className="flex-grow p-6 overflow-auto bg-gray-50 pb-28">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border min-h-full relative">
            {/* 💡 統計情報を開くトグルボタンを新設 */}
              <button 
                onClick={() => setIsStatsModalOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-all flex items-center gap-2"
              >
                <span className="text-base">📊</span> 分析・アナリティクス
              </button>
            {/* 💡 3. 右上のボタン群にクリティカルパストグルを追加 */}
            {selectedPageId && (
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                  onClick={() => setShowCriticalPath(!showCriticalPath)}
                  className={`text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 border
                    ${showCriticalPath 
                      ? 'bg-red-50 text-red-600 border-red-200 ring-2 ring-red-500/20' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className="text-base">🔥</span> 
                  {showCriticalPath ? 'クリティカルパスON' : 'クリティカルパス'}
                </button>
                <button 
                  onClick={openImportModal}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <span className="text-base">📄</span> JSONから一括追加
                </button>
              </div>
            )}
            {/* 💡 JSONインポートボタン（ページ選択時のみキャンバス右上に表示） */}
            {selectedPageId && (
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={openImportModal}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <span className="text-base">📄</span> JSONから一括追加
                </button>
              </div>
            )}

            {!selectedPageId ? (
              <div className="text-center py-24 text-gray-400 text-sm">
                サイドバーからページを選択するか、新しく作成してください。
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed rounded-xl">
                <p className="text-gray-400 text-sm mb-3">このページにはまだタスクがありません</p>
                <button onClick={() => { setInitialParentId('HEAD'); setIsTaskModalOpen(true); }} className="text-blue-600 font-bold text-sm">
                  ルートタスクを作成する
                </button>
              </div>
            ) : (
              <WorkspaceCanvas 
                tasks={tasks} positions={positions} canvasWidth={canvasWidth} canvasHeight={canvasHeight} fields={fields}
                onEditTask={setEditingTask} onAddFromNode={(parentId, e) => { e.stopPropagation(); setInitialParentId(parentId); setIsTaskModalOpen(true); }} showCriticalPath={showCriticalPath}       // ← 追加
                criticalPathIds={criticalPathIds}
              />
            )}
          </div>
        </main>

        {/* 4. ダッシュボード & ターミナル */}
        <WorkspaceDashboard selectedPageId={selectedPageId} tasks={tasks} />
        <button
          type="button"
          onClick={() => setIsTerminalOpen(prev => !prev)}
          className="absolute bottom-0 left-0 w-10 h-10 bg-transparent cursor-default z-50 focus:outline-none"
          aria-label="Toggle Debug Console"
        />
        <TerminalConsole 
          isOpen={isTerminalOpen} 
          onClose={() => setIsTerminalOpen(false)} 
          tasks={tasks}
          onQuickAdd={async (title) => {
            await addTask({ 
              roomId: activeRoomId!, 
              title, 
              assignee: 'CLI_USER', 
              startDate: '', 
              endDate: '', 
              metadata: { status: '未着手' }, 
              chosenPrevTaskId: null 
            });
          }}
          onQuickStatus={async (taskId, nextStatus) => {
            await updateTask(taskId, { metadata: { ...tasks.find(t => t.id === taskId)?.metadata, status: nextStatus } });
          }}
        />
      </div>

      {/* --- モーダル群 --- */}
      <EditRoomModal room={room} isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} onUpdateRoom={updateRoom} />
      <AddFieldForm roomId={id} isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} />
      
      <AddTaskForm 
        roomId={activeRoomId!} 
        formFields={fields} tasks={tasks} isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} validateConnection={validateConnection} 
        onSubmit={async (title, assignee, start, end, meta, prevId) => { 
          if (!validateConnection(prevId, null)) { alert('循環参照が検知されました'); return; } 
          await addTask({ roomId: activeRoomId!, title, assignee, startDate: start, endDate: end, metadata: meta, chosenPrevTaskId: prevId }); 
        }} 
        initialParentId={initialParentId} isLoading={isTaskLoading} 
      />

      <EditTaskModal 
        task={editingTask} formFields={fields} tasks={tasks} isOpen={editingTask !== null} isAuth={isAuth} onClose={() => setEditingTask(null)} validateConnection={validateConnection} 
        onUpdate={async (taskId, fieldsToUpdate) => { if ('prev_task_id' in fieldsToUpdate && !validateConnection(fieldsToUpdate.prev_task_id, taskId)) return; await updateTask(taskId, fieldsToUpdate); }} 
        onDelete={deleteTask} 
      />

      {/* 💡 JSON一括インポート用モーダル */}
      <TaskImportModal 
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        jsonInput={jsonInput}
        setJsonInput={setJsonInput}
        importStatus={importStatus}
        onImport={handleImportJSON}
      />
      <StatisticsModal 
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        tasks={tasks}
        pages={pages}
        roomName={room?.name}
        selectedPageId={selectedPageId}
        criticalPathIds={criticalPathIds} // 💡 これを渡すことで、モーダル内で主幹ルートの消化率がわかります
      />

    </div>
  );
};