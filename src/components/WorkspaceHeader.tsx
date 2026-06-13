
import { useNavigate } from 'react-router-dom';
import type { TaskPageItem } from '../hooks/useTaskPages';
import type { Room, Task } from '../types';

type Props = {
    roomId: string;
    room: Room | null;
    pages: TaskPageItem[];
    selectedPageId: string | null;
    tasks: Task[];
    toggleCopyable: (allowed: boolean) => void;
    onAddTask: (parentId: string) => void;
};

export const WorkspaceHeader = (props: Props) => {
  const navigate = useNavigate();
  const currentPageName = props.pages.find(p => p.id === props.selectedPageId)?.name || 'ワークスペース';

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">{currentPageName}</h2>
        
        {props.room && (
          <div className="flex items-center gap-3">
            {/* 複製許可トグル */}
            <label className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-100 select-none transition-all shadow-xs">
              <input 
                type="checkbox" 
                checked={props.room.is_copyable} 
                onChange={e => props.toggleCopyable(e.target.checked)} 
                className="rounded text-blue-600 w-3.5 h-3.5 focus:ring-0 cursor-pointer" 
              />
              <span className={`font-bold transition-colors ${props.room.is_copyable ? 'text-green-600' : 'text-gray-400'}`}>
                {props.room.is_copyable ? '複製許可：有効' : '複製許可：無効'}
              </span>
            </label>
            
            <button onClick={() => navigate(`/workspace/${props.roomId}/share`)} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm">
              共有リンクの発行
            </button>
          </div>
        )}
      </div>
      
      {/* タスク追加ボタン（ページ選択時のみ） */}
      {props.selectedPageId && (
        <button 
          onClick={() => props.onAddTask(props.tasks.length > 0 ? props.tasks[0].id : 'HEAD')} 
          className="bg-blue-600 text-white font-bold py-2 px-5 rounded-xl text-sm shadow-sm hover:bg-blue-700"
        >
          タスクを追加
        </button>
      )}
    </header>
  );
};