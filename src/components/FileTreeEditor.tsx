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
  onAddLink: (name: string, targetRoomId: string) => Promise<boolean>;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveOut: (id: string) => void;
  onMoveIn: (id: string) => void;
};

export const FileTreeEditor = ({
  pages, selectedPageId, setSelectedPageId, onRename, onDelete, onAddChild, onAddLink,
  onMoveUp, onMoveDown, onMoveOut, onMoveIn
}: FileTreeEditorProps) => {
  const [showRootInput, setShowRootInput] = useState<false | 'page' | 'folder' | 'link'>(false);
  const [rootName, setRootName] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');

  const rootItems = pages.filter((p) => p.parent_id === null);

  const handleCreateRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showRootInput === 'link') {
      if (rootName.trim() && linkTargetId.trim()) {
        await onAddLink(rootName.trim(), linkTargetId.trim());
        setRootName('');
        setLinkTargetId('');
        setShowRootInput(false);
      }
    } else if (rootName.trim() && showRootInput) {
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
          <button onClick={() => setShowRootInput('link')} className="text-slate-400 hover:text-white text-[11px] font-bold transition-colors">🔗 リンク</button>
        </div>
      </div>

      {showRootInput && (
        <form onSubmit={handleCreateRootSubmit} className="px-1 flex-shrink-0 space-y-1">
          <input 
            type="text" 
            placeholder={showRootInput === 'link' ? "表示名 (例: 別プロジェクト)" : showRootInput === 'folder' ? "フォルダ名..." : "ページ名..."} 
            value={rootName} 
            onChange={e => setRootName(e.target.value)} 
            autoFocus 
            className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" 
          />
          {showRootInput === 'link' && (
            <input 
              type="text" 
              placeholder="リンク先ルームID" 
              value={linkTargetId} 
              onChange={e => setLinkTargetId(e.target.value)} 
              className="w-full bg-slate-900 text-blue-300 font-mono border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" 
            />
          )}
          <div className="flex gap-1 justify-end pt-1">
            <button type="button" onClick={() => setShowRootInput(false)} className="text-xs text-slate-500 px-2">キャンセル</button>
            <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded">追加</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto pr-0.5 space-y-1 min-h-0 rounded-xl flex flex-col justify-between">
        <div className="space-y-1 w-full">
          {rootItems.length === 0 ? (
            <p className="text-[11px] text-slate-600 px-2 py-6 text-center leading-relaxed">
              ファイルが存在しません。<br/>上部メニューから作成してください。
            </p>
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