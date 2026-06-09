import { useState } from 'react';
import type { TaskPageItem } from '../hooks/useTaskPages';
import { TreeItem } from './TreeItem';

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
  pages, selectedPageId, setSelectedPageId, onRename, onDelete, onAddChild,
  onMoveUp, onMoveDown, onMoveOut, onMoveIn
}: FileTreeEditorProps) => {
  const [showRootInput, setShowRootInput] = useState<false | 'page' | 'folder'>(false);
  const [rootName, setRootName] = useState('');

  const rootItems = pages.filter((p) => p.parent_id === null);

  const handleCreateRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rootName.trim() && showRootInput) {
      await onAddChild(rootName.trim(), showRootInput === 'folder', null);
      setRootName('');
      setShowRootInput(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 p-3 space-y-3 font-sans shadow-xl">
      <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800/80 flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">エクスプローラー</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRootInput('page')} className="text-slate-400 hover:text-white text-[11px] font-bold transition-colors">📄 ページ</button>
          <button onClick={() => setShowRootInput('folder')} className="text-slate-400 hover:text-white text-[11px] font-bold transition-colors">📁 フォルダ</button>
        </div>
      </div>

      {showRootInput && (
        <form onSubmit={handleCreateRootSubmit} className="px-1 flex-shrink-0">
          <input type="text" placeholder={showRootInput === 'folder' ? "フォルダ名..." : "ページ名..."} value={rootName} onChange={e => setRootName(e.target.value)} onBlur={() => setTimeout(() => setShowRootInput(false), 200)} autoFocus className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
        </form>
      )}

      <div className="flex-1 overflow-y-auto pr-0.5 space-y-1 min-h-0 rounded-xl flex flex-col justify-between">
        <div className="space-y-1 w-full">
          {rootItems.length === 0 ? (
            <p className="text-[11px] text-slate-600 px-2 py-6 text-center leading-relaxed">ファイルが存在しません。<br/>上部メニューから作成してください。</p>
          ) : (
            rootItems.map((item, idx) => (
              <TreeItem
                key={item.id} item={item} index={idx} allPages={pages}
                selectedId={selectedPageId} onSelect={setSelectedPageId}
                onRename={onRename} onDelete={onDelete} onAddChild={onAddChild}
                onMoveUp={onMoveUp} onMoveDown={onMoveDown}
                onMoveOut={onMoveOut} onMoveIn={onMoveIn}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};