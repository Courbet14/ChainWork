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

const TreeItem = ({
  item,
  index,
  allPages,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onMoveOut,
  onMoveIn
}: TreeItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showChildInput, setShowChildInput] = useState<false | 'page' | 'folder'>(false);
  const [childName, setChildName] = useState('');
  
  // 三点リーダーメニューの開閉状態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const children = allPages.filter(p => p.parent_id === item.id);
  const siblings = allPages.filter(p => p.parent_id === item.parent_id);

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
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
          ${!item.is_folder && selectedId === item.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'hover:bg-slate-800/40 border-transparent'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => item.is_folder && setIsOpen(!isOpen)}>
          {item.is_folder ? (
            <span className="text-slate-500 font-mono text-[9px] w-3 text-center">{isOpen ? '▼' : '▶'}</span>
          ) : (
            <span className="w-3" />
          )}
          <span className="text-sm flex-shrink-0">{item.is_folder ? (isOpen ? '📂' : '📁') : '📄'}</span>
          
          {isEditing ? (
            <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()} className="flex-1">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleRenameSubmit} autoFocus className="w-full bg-slate-950 text-white border border-blue-500 rounded-lg px-2 py-0.5 text-xs focus:outline-none" />
            </form>
          ) : (
            <span className="truncate flex-1 font-mono tracking-wide">{item.name}</span>
          )}
        </div>

        {/* 🛠️ ボタン操作ツールバー（ホバー時に三点リーダー1つだけをスッキリ表示） */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center bg-slate-900/90 backdrop-blur-xs rounded-lg px-1 py-0.5" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`p-1 rounded hover:bg-slate-700 text-slate-300 font-bold transition-colors ${isMenuOpen ? 'bg-slate-700' : ''}`}
            title="操作メニューを開く"
          >
            💬
          </button>
        </div>
      </div>

      {/* 💡 【大進化】すべての操作を文字解説付きで集約したポップアップメニュー */}
      {isMenuOpen && (
        <div 
          ref={menuRef}
          className="absolute right-2 top-8 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={e => e.stopPropagation()}
        >
          {/* 🔼 🔽 位置の並び替えセクション */}
          <div className="px-2.5 py-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">位置を並び替える</div>
          <button 
            onClick={() => { onMoveUp(item.id); setIsMenuOpen(false); }}
            disabled={index === 0}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2.5 text-slate-200"
          >
            <span>🔼</span> 1つ上に移動
          </button>
          <button 
            onClick={() => { onMoveDown(item.id); setIsMenuOpen(false); }}
            disabled={index === siblings.length - 1}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2.5 text-slate-200"
          >
            <span>🔽</span> 1つ下に移動
          </button>

          {/* ↩️ ↪️ 階層の移動セクション（条件に合う時だけ表示） */}
          {(item.parent_id || (index > 0 && siblings[index - 1].is_folder)) && (
            <>
              <div className="border-t border-slate-700/60 my-1" />
              <div className="px-2.5 py-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">階層構造を変更</div>
              {item.parent_id && (
                <button 
                  onClick={() => { onMoveOut(item.id); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2.5 text-slate-200"
                >
                  <span>↩️</span> フォルダの外に出す
                </button>
              )}
              {index > 0 && siblings[index - 1].is_folder && (
                <button 
                  onClick={() => { onMoveIn(item.id); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2.5 text-slate-200"
                >
                  <span>↪️</span> 上のフォルダに格納
                </button>
              )}
            </>
          )}

          {/* 📄 📁 管理セクション */}
          <div className="border-t border-slate-700/60 my-1" />
          <div className="px-2.5 py-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">アイテム管理</div>
          {item.is_folder && (
            <>
              <button 
                onClick={() => { setShowChildInput('page'); setIsMenuOpen(false); }} 
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2.5 text-slate-200"
              >
                <span>📄</span> 新しい子ページ
              </button>
              <button 
                onClick={() => { setShowChildInput('folder'); setIsMenuOpen(false); }} 
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2.5 text-slate-200"
              >
                <span>📁</span> 新しい子フォルダ
              </button>
            </>
          )}
          <button 
            onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} 
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2.5 text-slate-200"
          >
            <span>✏️</span> 名前を変更
          </button>
          <button 
            onClick={() => { setIsMenuOpen(false); if(confirm(`「${item.name}」を削除しますか？`)) onDelete(item.id); }} 
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-950/60 text-red-400 font-bold flex items-center gap-2.5"
          >
            <span>🗑️</span> 削除する
          </button>
        </div>
      )}

      {showChildInput && (
        <form onSubmit={handleCreateChildSubmit} className="pl-6 pr-2 py-1 flex gap-1">
          <input type="text" placeholder={showChildInput === 'folder' ? "新フォルダ名..." : "新ページ名..."} value={childName} onChange={e => setChildName(e.target.value)} onBlur={() => setTimeout(() => setShowChildInput(false), 200)} autoFocus className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none" />
        </form>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

type FileTreeEditorProps = {
  pages: TaskPageItem[];
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddChild: (name: string, isFolder: boolean, parentId: string | null) => Promise<void>;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveOut: (id: string) => void;
  onMoveIn: (id: string) => void;
};

export const FileTreeEditor = ({
  pages,
  selectedPageId,
  setSelectedPageId,
  onRename,
  onDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onMoveOut,
  onMoveIn
}: FileTreeEditorProps) => {
  const [showRootInput, setShowRootInput] = useState<false | 'page' | 'folder'>(false);
  const [rootName, setRootName] = useState('');

  const rootItems = pages.filter(p => p.parent_id === null);

  const handleCreateRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rootName.trim() && showRootInput) {
      await onAddChild(rootName.trim(), showRootInput === 'folder', null);
      setRootName('');
      setShowRootInput(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 p-3 space-y-3 font-sans shadow-2xl">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800/80 flex-shrink-0">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🗂️ ファイルエディタ</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRootInput('page')} className="text-slate-400 hover:text-white text-[11px] font-bold transition-colors">📄+ ページ</button>
          <button onClick={() => setShowRootInput('folder')} className="text-slate-400 hover:text-white text-[11px] font-bold transition-colors">📁+ フォルダ</button>
        </div>
      </div>

      {showRootInput && (
        <form onSubmit={handleCreateRootSubmit} className="px-1 flex-shrink-0">
          <input type="text" placeholder={showRootInput === 'folder' ? "新しいフォルダ..." : "新しいページ..."} value={rootName} onChange={e => setRootName(e.target.value)} onBlur={() => setTimeout(() => setShowRootInput(false), 200)} autoFocus className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
        </form>
      )}

      <div className="flex-1 overflow-y-auto pr-0.5 space-y-1 min-h-0 rounded-xl flex flex-col justify-between">
        <div className="space-y-1 w-full">
          {rootItems.length === 0 ? (
            <p className="text-[11px] text-slate-600 italic px-2 py-6 text-center leading-relaxed">アイテムがありません。<br/>上のボタンから作成してください。</p>
          ) : (
            rootItems.map((item, idx) => (
              <TreeItem
                key={item.id}
                item={item}
                index={idx}
                allPages={pages}
                selectedId={selectedPageId}
                onSelect={setSelectedPageId}
                onRename={onRename}
                onDelete={onDelete}
                onAddChild={onAddChild}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onMoveOut={onMoveOut}
                onMoveIn={onMoveIn}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};