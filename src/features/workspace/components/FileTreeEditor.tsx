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
  onMoveToFolder: (id: string, targetParentId: string | null) => Promise<void>; // 💡 ここに型定義を追加
};

export const FileTreeEditor = ({
  pages, selectedPageId, setSelectedPageId, onRename, onDelete, onAddChild, onAddLink,
  onMoveUp, onMoveDown, onMoveOut, onMoveIn, onMoveToFolder // 💡 ここでも受け取る
}: FileTreeEditorProps) => {
  const [showRootInput, setShowRootInput] = useState<false | 'page' | 'folder' | 'link'>(false);
  const [rootName, setRootName] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');

  const rootItems = pages.filter((p) => p.parent_id === null);

  const handleCreateRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootName.trim()) return;
    
    if (showRootInput === 'link') {
      if (!linkTargetId.trim()) return;
      await onAddLink(rootName.trim(), linkTargetId.trim());
    } else {
      await onAddChild(rootName.trim(), showRootInput === 'folder', null);
    }
    
    setRootName('');
    setLinkTargetId('');
    setShowRootInput(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700/80 overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ファイル</span>
        <div className="flex gap-1">
          <button onClick={() => setShowRootInput('page')} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="新規ページ">📄</button>
          <button onClick={() => setShowRootInput('folder')} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="新規フォルダ">📁</button>
          <button onClick={() => setShowRootInput('link')} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="外部ワークスペースリンク">🔗</button>
        </div>
      </div>

      {showRootInput && (
        <form onSubmit={handleCreateRootSubmit} className="p-2 border-b border-slate-700 bg-slate-800/50 flex flex-col gap-1.5">
          <input 
            type="text" 
            placeholder={showRootInput === 'folder' ? "フォルダ名..." : showRootInput === 'link' ? "リンク表示名..." : "ページ名..."} 
            value={rootName} 
            onChange={e => setRootName(e.target.value)} 
            autoFocus 
            className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" 
          />
          {showRootInput === 'link' && (
            <input 
              type="text" 
              placeholder="対象ワークスペースID" 
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
                onMoveToFolder={onMoveToFolder} // 💡 TreeItemに流し込む
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};