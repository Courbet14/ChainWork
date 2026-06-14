import { useState, useEffect, useRef } from 'react';
import type { TaskPageItem } from '../hooks/useTaskPages';

type TreeItemProps = {
  item: TaskPageItem;
  index: number;
  allPages: TaskPageItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void; // 💡 null許容に修正
  onRename: (id: string, nextName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddChild: (name: string, isFolder: boolean, parentId: string) => Promise<void>;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveOut: (id: string) => void;
  onMoveIn: (id: string) => void;
  onMoveToFolder: (id: string, targetParentId: string | null) => Promise<void>; // 💡 ここを確実に追加
};

export const TreeItem = ({
  item, index, allPages, selectedId, onSelect, onRename, onDelete, onAddChild, onMoveUp, onMoveDown, onMoveOut, onMoveIn, onMoveToFolder
}: TreeItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showChildInput, setShowChildInput] = useState<false | 'page' | 'folder'>(false);
  const [childName, setChildName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const children = allPages.filter((p) => p.parent_id === item.id).sort((a, b) => a.sort_order - b.sort_order);
  const isSelected = selectedId === item.id;
  const isLink = !!item.target_room_id;
  const isMountedNode = item.is_mounted;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editName !== item.name) {
      await onRename(item.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCreateChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childName.trim()) {
      await onAddChild(childName.trim(), showChildInput === 'folder', item.id);
      setIsOpen(true);
    }
    setChildName('');
    setShowChildInput(false);
  };

  const handleItemClick = () => {
    if (item.is_folder) {
      setIsOpen(!isOpen);
    } else if (!isLink) { // 💡 リンク以外のページはマウントされていても開けるように修正済み
      onSelect(item.id);
    }
  };

  return (
    <div className="select-none relative">
      <div 
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-700/50 text-slate-300'}
          ${isMountedNode ? 'opacity-80' : ''}`}
        onClick={handleItemClick}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-4 flex-shrink-0 text-center opacity-70">
            {isLink ? '🔗' : item.is_folder ? (isOpen ? '📂' : '📁') : '📄'}
          </span>
          {isEditing && !isMountedNode ? (
            <form onSubmit={handleRenameSubmit} className="flex-1" onClick={e => e.stopPropagation()}>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleRenameSubmit} autoFocus className="w-full bg-slate-900 text-white border border-slate-700 rounded px-1.5 py-0.5 text-xs" />
            </form>
          ) : (
            <span className={`text-sm truncate ${isLink ? 'text-blue-300 font-bold' : ''}`}>
              {item.name}
            </span>
          )}
        </div>

        {!isMountedNode && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity pl-2" onClick={e => e.stopPropagation()}>
            {item.is_folder && !isLink && (
              <>
                <button onClick={() => setShowChildInput('page')} className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white" title="ページ追加">📄</button>
                <button onClick={() => setShowChildInput('folder')} className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white" title="フォルダ追加">📁</button>
              </>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white">⚙️</button>
          </div>
        )}
      </div>

      {isMenuOpen && (
        <div ref={menuRef} className="absolute right-2 top-8 z-50 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between px-2 pb-1 mb-1 border-b border-slate-700">
            <button onClick={() => { onMoveUp(item.id); setIsMenuOpen(false); }} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="上へ">↑</button>
            <button onClick={() => { onMoveDown(item.id); setIsMenuOpen(false); }} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="下へ">↓</button>
            <button onClick={() => { onMoveOut(item.id); setIsMenuOpen(false); }} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="階層を上げる（外へ）">←</button>
          </div>
          
          <div className="px-2 py-1.5 border-b border-slate-700">
            <label className="text-[10px] text-slate-400 font-bold block mb-1">📂 移動先のフォルダ</label>
            <select 
              value={item.parent_id || 'root'}
              onChange={(e) => {
                const target = e.target.value === 'root' ? null : e.target.value;
                onMoveToFolder(item.id, target);
                setIsMenuOpen(false);
              }}
              className="w-full bg-slate-900 text-slate-300 text-xs border border-slate-700 rounded py-1.5 px-1 focus:outline-none focus:border-blue-500"
            >
              <option value="root">-- ルート階層 --</option>
              {allPages.filter(p => p.is_folder && p.id !== item.id).map(f => (
                <option key={f.id} value={f.id}>📁 {f.name}</option>
              ))}
            </select>
          </div>

          <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 text-slate-200">名前を変更</button>
          <button onClick={() => { setIsMenuOpen(false); if(confirm(`「${item.name}」を削除しますか？`)) onDelete(item.id); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-950/60 text-red-400 font-bold">削除</button>
        </div>
      )}

      {showChildInput && (
        <div className="pl-6 pr-2 py-1">
          <form onSubmit={handleCreateChildSubmit} className="flex gap-1 items-center bg-slate-900 border border-slate-700 rounded-lg pr-1">
            <input 
              type="text" 
              placeholder={showChildInput === 'folder' ? "フォルダ名..." : "ページ名..."} 
              value={childName} 
              onChange={e => setChildName(e.target.value)} 
              autoFocus 
              className="w-full bg-transparent text-slate-200 px-2.5 py-1 text-xs focus:outline-none" 
            />
            <button type="submit" className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded font-bold transition-colors">追加</button>
            <button type="button" onClick={() => setShowChildInput(false)} className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5">✕</button>
          </form>
        </div>
      )}

      {item.is_folder && isOpen && children.length > 0 && (
        <div className="pl-2 border-l border-slate-800/60 mt-1 space-y-1 ml-3">
          {children.map((child, childIdx) => (
            <TreeItem
              key={child.id} 
              item={child} 
              index={childIdx} 
              allPages={allPages}
              selectedId={selectedId} 
              onSelect={onSelect}
              onRename={onRename} 
              onDelete={onDelete} 
              onAddChild={onAddChild}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onMoveOut={onMoveOut}
              onMoveIn={onMoveIn}
              onMoveToFolder={onMoveToFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};