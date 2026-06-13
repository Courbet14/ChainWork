
import { FileTreeEditor } from './FileTreeEditor';
import type { TaskPageItem } from '../hooks/useTaskPages';
import type { Room } from '../types';

type Props = {
  roomId: string;
  room: Room | null;
  pages: TaskPageItem[];
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  sourceRoomInput: string;
  setSourceRoomInput: (val: string) => void;
  onExecuteClone: () => void;
  isRoomLoading: boolean;
  onRenamePage: (id: string, name: string) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  onAddPage: (name: string, isFolder: boolean, parentId: string | null) => Promise<void>;
  onAddLink: (name: string, targetRoomId: string) => Promise<boolean>;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveOut: (id: string) => void;
  onMoveIn: (id: string) => void;
  openRoomModal: () => void;
  openFieldModal: () => void;
};

export const WorkspaceSidebar = (props: Props) => {
  return (
    <aside className="w-80 bg-slate-900 text-slate-200 p-4 flex flex-col justify-between border-r border-slate-800 z-20 overflow-hidden">
      <div className="space-y-4 flex flex-col h-full overflow-hidden">
        {/* ロゴ・ルーム情報 */}
        <div className="border-b border-slate-800 pb-3 flex-shrink-0">
          <h2 className="text-2xl font-black tracking-wider text-white">ChainWork</h2>
          <div className="flex items-center justify-between mt-1 text-xs text-slate-400 font-mono">
            <span>Room ID: {props.roomId}</span>
          </div>
          <p className="text-sm font-bold text-blue-400 font-sans mt-1 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-800/50 truncate">
            {props.room?.name || 'Loading...'}
          </p>
        </div>

        {/* テンプレート複製入力部 */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700/80 space-y-2 mb-4 flex-shrink-0">
            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest">テンプレートをインポート</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="対象ルームID" 
                value={props.sourceRoomInput} 
                onChange={e => props.setSourceRoomInput(e.target.value)} 
                className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none" 
              />
              <button 
                type="button" 
                onClick={props.onExecuteClone} 
                disabled={props.isRoomLoading || !props.sourceRoomInput.trim()} 
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 rounded-lg font-bold shadow-md transition-colors flex-shrink-0 disabled:opacity-50"
              >
                複製
              </button>
            </div>
          </div>

          {/* ファイルツリー */}
          {/* ファイルツリー */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <FileTreeEditor 
              pages={props.pages} 
              selectedPageId={props.selectedPageId} 
              setSelectedPageId={props.setSelectedPageId} 
              onRename={props.onRenamePage} 
              onDelete={props.onDeletePage} 
              onAddChild={props.onAddPage} 
              onAddLink={props.onAddLink}  // 💡 ここを追加してください！
              onMoveUp={props.onMoveUp} 
              onMoveDown={props.onMoveDown} 
              onMoveOut={props.onMoveOut} 
              onMoveIn={props.onMoveIn} 
            />
          </div>
        </div>
      </div>

      {/* 下部設定ボタン */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 flex-shrink-0">
        <button onClick={props.openRoomModal} className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all shadow-sm">
          環境設定
        </button>
        <button onClick={props.openFieldModal} className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all shadow-sm">
          カスタム項目
        </button>
      </div>
    </aside>
  );
};