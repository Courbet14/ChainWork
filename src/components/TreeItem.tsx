import { useState, useEffect, useRef } from 'react';
import type { TaskPageItem } from '../hooks/useTaskPages';

type TreeItemProps = {
  item: TaskPageItem;
  index: number;
  allPages: TaskPageItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, nextName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddChild: (name: string, isFolder: boolean, parentId: string) => Promise<void>;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveOut: (id: string) => void;
  onMoveIn: (id: string) => void;
};

// ツリーの各アイテム(フォルダ・ページ)のレンダリング
export const TreeItem = ({
  item, index, allPages, selectedId, onSelect, onRename, onDelete, onAddChild, onMoveUp, onMoveDown, onMoveOut, onMoveIn
}: TreeItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showChildInput, setShowChildInput] = useState<false | 'page' | 'folder'>(false);
  const [childName, setChildName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const children = allPages.filter((p) => p.parent_id === item.id);
  const siblings = allPages.filter((p) => p.parent_id === item.parent_id);

  // メニューの外側をクリックした時に閉じる処理
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editName.trim() !== item.name) {
      await onRename(item.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCreateChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childName.trim() && showChildInput) {
      await onAddChild(childName.trim(), showChildInput === 'folder', item.id);
      setChildName('');
      setShowChildInput(false);
      setIsOpen(true);
    }
  };

  return (
    <div className="select-none text-slate-300 pl-1 font-sans mb-1 w-full relative">
      <div 
        onClick={() => !item.is_folder && onSelect(item.id)}
        className={`group flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-medium cursor-pointer border
          ${!item.is_folder && selectedId === item.id ? 'bg-slate-700 text-white shadow-sm' : 'hover:bg-slate-800/40 border-transparent'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => item.is_folder && setIsOpen(!isOpen)}>
          {item.is_folder ? (
            <span className="text-slate-500 font-mono text-[9px] w-3 text-center">{isOpen ? '▼' : '▶'}</span>
          ) : (
            <span className="w-3" />
          )}
          
          {/* アイコンの切り替えロジックを追加 */}
          <span className="text-sm flex-shrink-0 text-slate-400">
            {item.target_room_id ? '🔗' : item.is_folder ? '📂' : '📄'}
          </span>
          
          {isEditing ? (
            <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()} className="flex-1">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleRenameSubmit} autoFocus className="w-full bg-slate-950 text-white border border-blue-500 rounded-lg px-2 py-0.5 text-xs focus:outline-none" />
            </form>
          ) : (
            <span className="truncate flex-1 font-mono tracking-wide">{item.name}</span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center bg-slate-900/90 backdrop-blur-xs rounded-lg px-1 py-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors">
            •••
          </button>
        </div>
      </div>

      {/* コンテキストメニュー */}
      {isMenuOpen && (
        <div ref={menuRef} className="absolute right-2 top-8 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden" onClick={e => e.stopPropagation()}>
          
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">並び替え</div>
          <button onClick={() => { onMoveUp(item.id); setIsMenuOpen(false); }} disabled={index === 0} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200">
            上に移動
          </button>
          <button onClick={() => { onMoveDown(item.id); setIsMenuOpen(false); }} disabled={index === siblings.length - 1} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200">
            下に移動
          </button>

          {(item.parent_id || (index > 0 && siblings[index - 1].is_folder)) && (
            <>
              <div className="border-t border-slate-700/60 my-1" />
              <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">階層</div>
              {item.parent_id && (
                <button onClick={() => { onMoveOut(item.id); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 text-slate-200">
                  フォルダの外へ
                </button>
              )}
              {index > 0 && siblings[index - 1].is_folder && (
                <button onClick={() => { onMoveIn(item.id); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 text-slate-200">
                  上のフォルダへ格納
                </button>
              )}
            </>
          )}

          <div className="border-t border-slate-700/60 my-1" />
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">管理</div>
          
          {item.is_folder && (
            <>
              <button onClick={() => { setShowChildInput('page'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 text-slate-200">
                新しいページ
              </button>
              <button onClick={() => { setShowChildInput('folder'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 text-slate-200">
                新しいフォルダ
              </button>
            </>
          )}
          <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 text-slate-200">
            名前を変更
          </button>
          <button onClick={() => { setIsMenuOpen(false); if(confirm(`「${item.name}」を削除しますか？`)) onDelete(item.id); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-950/60 text-red-400 font-bold">
            削除
          </button>
        </div>
      )}

      {showChildInput && (
        <form onSubmit={handleCreateChildSubmit} className="pl-6 pr-2 py-1 flex gap-1">
          <input type="text" placeholder={showChildInput === 'folder' ? "フォルダ名..." : "ページ名..."} value={childName} onChange={e => setChildName(e.target.value)} onBlur={() => setTimeout(() => setShowChildInput(false), 200)} autoFocus className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none" />
        </form>
      )}

      {item.is_folder && isOpen && children.length > 0 && (
        <div className="pl-2 border-l border-slate-800/60 mt-1 space-y-1 ml-3">
          {children.map((child, childIdx) => (
            <TreeItem
              key={child.id} item={child} index={childIdx} allPages={allPages}
              selectedId={selectedId} onSelect={onSelect} onRename={onRename}
              onDelete={onDelete} onAddChild={onAddChild} onMoveUp={onMoveUp}
              onMoveDown={onMoveDown} onMoveOut={onMoveOut} onMoveIn={onMoveIn}
            />
          ))}
        </div>
      )}
    </div>
  );
};