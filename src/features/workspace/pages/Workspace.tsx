import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useXarrow } from 'react-xarrows';

import { useRoom } from '../hooks/useRoom';
import { useTaskPages } from '../hooks/useTaskPages';
import { useFormFields } from '../hooks/useFormFields';
import { useTasks } from '../hooks/useTasks';
import { useWorkspaceLayout } from '../hooks/useWorkspaceLayout';
import { useChainValidation } from '../hooks/useChainValidation';
import { useTaskImport } from '../hooks/useTaskImport';
import { useCriticalPath } from '../hooks/useCriticalPath';

import { AddFieldForm } from '../components/AddFieldForm';
import { AddTaskForm } from '../components/AddTaskForm';
import { EditTaskModal } from '../components/EditTaskModal';
import { EditRoomModal } from '../components/EditRoomModal';
import { PasswordGate } from '../components/PasswordGate';
import { TaskImportModal } from '../components/TaskImportModal';
import { StatisticsModal } from '../components/StatisticsModal';
import { RoomMemoModal } from '../components/RoomMemoModal'; // 💡 追加

import { WorkspaceSidebar } from '../components/WorkspaceSidebar';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { WorkspaceDashboard } from '../components/WorkspaceDashboard';
import { WorkspaceCanvas } from '../components/WorkspaceCanvas';
import { TerminalConsole } from '../components/TerminalConsole';

import type { Task } from '../../../types';

export const Workspace = () => {
  const { id } = useParams<{ id: string }>();
  const activeRoomId = id;

  const { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading: isRoomLoading } = useRoom(activeRoomId);
  const { pages, selectedPageId, setSelectedPageId, createPage, createFolder, createLink, updateItemName, deleteItem, moveItemUp, moveItemDown, moveItemOut, moveItemIn, moveToFolder } = useTaskPages(activeRoomId);
  const { fields } = useFormFields(activeRoomId);
  const { tasks, addTask, updateTask, deleteTask, isLoading: isTaskLoading } = useTasks(selectedPageId);
  const { validateConnection } = useChainValidation(tasks);
  const { positions, canvasHeight, canvasWidth } = useWorkspaceLayout(tasks);
  const { criticalPathIds } = useCriticalPath(tasks);
  const { isImportModalOpen, jsonInput, setJsonInput, importStatus, handleImportJSON, openModal: openImportModal, closeModal: closeImportModal } = useTaskImport(activeRoomId, selectedPageId);
  const updateXarrow = useXarrow();

  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [sourceRoomInput, setSourceRoomInput] = useState('');
  
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false); // 💡 追加
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | 'HEAD'>('HEAD');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateXarrow();
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, positions, isFieldModalOpen, isRoomModalOpen, isMemoModalOpen, isAddingTask, editingTask, isTerminalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' && e.ctrlKey) setIsTerminalOpen(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await verifyPassword(passwordInput);
    if (!success) setAuthError(true);
  };

  const handleExecuteClone = async () => {
    if (!sourceRoomInput.trim() || !activeRoomId) return;
    const success = await cloneWholeRoom(sourceRoomInput.trim(), activeRoomId);
    if (success) setSourceRoomInput('');
  };

  const handleAddTaskClick = (parentId: string | 'HEAD' = 'HEAD') => {
    setInitialParentId(parentId);
    setIsAddingTask(true);
  };

  if (isRoomLoading && !room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuth) {
    return (
      <PasswordGate 
        roomId={activeRoomId || ''} roomName={room?.name || 'Loading...'} authError={authError} 
        passwordInput={passwordInput} setPasswordInput={setPasswordInput} onSubmit={handlePasswordSubmit} 
      />
    );
  }

  return (
    <div className="relative flex h-screen bg-gray-100 overflow-hidden text-gray-800">
      <WorkspaceSidebar 
        roomId={activeRoomId!} room={room} pages={pages} selectedPageId={selectedPageId} setSelectedPageId={setSelectedPageId} 
        sourceRoomInput={sourceRoomInput} setSourceRoomInput={setSourceRoomInput} onExecuteClone={handleExecuteClone} isRoomLoading={isRoomLoading} 
        onRenamePage={updateItemName} onDeletePage={deleteItem} onAddPage={(name, isFolder, pid) => isFolder ? createFolder(name, pid) : createPage(name, pid)} 
        onAddLink={createLink} onMoveUp={moveItemUp} onMoveDown={moveItemDown} onMoveOut={moveItemOut} onMoveIn={moveItemIn} onMoveToFolder={moveToFolder}
        openRoomModal={() => setIsRoomModalOpen(true)} openFieldModal={() => setIsFieldModalOpen(true)} openMemoModal={() => setIsMemoModalOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <WorkspaceHeader 
          roomId={activeRoomId!} room={room} pages={pages} selectedPageId={selectedPageId} tasks={tasks} 
          toggleCopyable={toggleCopyable} onAddTask={handleAddTaskClick} 
        />
        
        <main className="flex-grow p-6 overflow-auto bg-gray-50 pb-28 relative">
          <div className="bg-white p-6 rounded-2xl shadow-sm border min-h-full relative overflow-hidden" onScroll={updateXarrow}>
            {selectedPageId && (
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                  onClick={() => setIsStatsModalOpen(true)}
                  className="bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-all"
                >
                  分析・アナリティクス
                </button>
                <button 
                  onClick={() => setShowCriticalPath(!showCriticalPath)}
                  className={`text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all border ${showCriticalPath ? 'bg-red-50 text-red-600 border-red-200 ring-2 ring-red-500/20' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                  クリティカルパス
                </button>
                <button 
                  onClick={openImportModal}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  JSONから一括追加
                </button>
              </div>
            )}

            {!selectedPageId ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                左側のメニューからページを選択するか、新しく作成してください。
              </div>
            ) : tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                <p>タスクがありません。右上のボタンから最初のタスクを追加してください。</p>
                <button onClick={() => handleAddTaskClick('HEAD')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-colors">
                  ルートタスクを追加
                </button>
              </div>
            ) : (
              <WorkspaceCanvas 
                tasks={tasks} positions={positions} canvasWidth={canvasWidth} canvasHeight={canvasHeight} fields={fields}
                onEditTask={setEditingTask} onAddFromNode={(pid, e) => { e.stopPropagation(); handleAddTaskClick(pid); }}
                showCriticalPath={showCriticalPath} criticalPathIds={criticalPathIds}
              />
            )}
          </div>
        </main>
      </div>

      <WorkspaceDashboard selectedPageId={selectedPageId} tasks={tasks} />

      <AddFieldForm roomId={activeRoomId!} isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} />
      
      <EditRoomModal 
        room={room} isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} 
        onUpdateRoom={updateRoom} 
      />

      {/* 💡 新規追加したルームメモ用モーダル */}
      <RoomMemoModal
        room={room} isOpen={isMemoModalOpen} isAuth={isAuth} onClose={() => setIsMemoModalOpen(false)}
        onUpdateRoom={updateRoom}
      />

      <AddTaskForm 
        roomId={activeRoomId!} formFields={fields} tasks={tasks} isOpen={isAddingTask} onClose={() => setIsAddingTask(false)} validateConnection={validateConnection} 
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

      <TaskImportModal 
        isOpen={isImportModalOpen} onClose={closeImportModal} jsonInput={jsonInput} setJsonInput={setJsonInput} importStatus={importStatus} onImport={handleImportJSON}
      />
      
      <StatisticsModal 
        isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} tasks={tasks} pages={pages} roomName={room?.name || undefined} selectedPageId={selectedPageId} criticalPathIds={criticalPathIds}
      />

      <TerminalConsole 
        isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} tasks={tasks} 
        onQuickAdd={async (title) => { await addTask({ roomId: activeRoomId!, title, assignee: '', startDate: '', endDate: '', metadata: { status: '未着手' }, chosenPrevTaskId: tasks.length > 0 ? tasks[0].id : null }); }}
        onQuickStatus={async (id, status) => { await updateTask(id, { metadata: { status } }); }}
      />
    </div>
  );
};