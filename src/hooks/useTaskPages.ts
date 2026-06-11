import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type TaskPageItem = {
  id: string;
  room_id: string;
  name: string;
  is_folder: boolean;
  parent_id: string | null;
  sort_order: number;
};

// フォルダとページの階層構造(エクスプローラー機能)を管理するフック
export const useTaskPages = (roomId: string | undefined) => {
  const [pages, setPages] = useState<TaskPageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPages = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', roomId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const fetchedData = data || [];
      setPages(fetchedData);
      
      // 選択中のページが削除された場合などは、最初のページを自動選択する
      setSelectedPageId((prev) => {
        if (prev && fetchedData.some((p) => p.id === prev && !p.is_folder)) return prev;
        const firstPage = fetchedData.find((p) => !p.is_folder);
        return firstPage ? firstPage.id : null;
      });
    } catch (err) {
      console.error('Fetch pages error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // ローカルステートを更新し、バックグラウンドでDBと同期する
  const syncWithDatabase = async (nextPages: TaskPageItem[]) => {
    setPages(nextPages);
    try {
      const updates = nextPages.map(({ id, room_id, name, is_folder, parent_id, sort_order }) => ({
        id, room_id, name, is_folder, parent_id, sort_order
      }));
      await supabase.from('task_pages').upsert(updates);
    } catch (err) {
      console.error('Database sync error:', err);
    }
  };

  const createItem = async (name: string, isFolder: boolean, parentId: string | null = null) => {
    if (!roomId || !name.trim()) return;

    try {
      const siblingCount = pages.filter((p) => p.parent_id === parentId).length;
      const { data, error } = await supabase
        .from('task_pages')
        .insert([{ 
          room_id: roomId, 
          name: name.trim(), 
          is_folder: isFolder, 
          parent_id: parentId, 
          sort_order: siblingCount 
        }])
        .select()
        .single();

      if (error) throw error;
      
      setPages((prev) => [...prev, data]);
      if (!isFolder) setSelectedPageId(data.id);
    } catch (err) {
      console.error('Create item error:', err);
    }
  };

  const updateItemName = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const { error } = await supabase.from('task_pages').update({ name: newName.trim() }).eq('id', id);
      if (error) throw error;
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName.trim() } : p)));
    } catch (err) {
      console.error('Update item name error:', err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('task_pages').delete().eq('id', id);
      if (error) throw error;
      setPages((prev) => prev.filter((p) => p.id !== id));
      setSelectedPageId((prev) => (prev === id ? null : prev));
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  // --- ツリー構造の操作 ---

  const moveItemUp = (id: string) => {
    const targetIdx = pages.findIndex((p) => p.id === id);
    if (targetIdx <= 0) return;

    const currentSiblings = pages.filter((p) => p.parent_id === pages[targetIdx].parent_id);
    const sibIdx = currentSiblings.findIndex((p) => p.id === id);
    if (sibIdx <= 0) return;

    const prevSibling = currentSiblings[sibIdx - 1];
    const prevGlobalIdx = pages.findIndex((p) => p.id === prevSibling.id);

    const nextPages = [...pages];
    [nextPages[targetIdx], nextPages[prevGlobalIdx]] = [nextPages[prevGlobalIdx], nextPages[targetIdx]];

    syncWithDatabase(nextPages.map((p, idx) => ({ ...p, sort_order: idx })));
  };

  const moveItemDown = (id: string) => {
    const targetIdx = pages.findIndex((p) => p.id === id);
    if (targetIdx === -1 || targetIdx === pages.length - 1) return;

    const currentSiblings = pages.filter((p) => p.parent_id === pages[targetIdx].parent_id);
    const sibIdx = currentSiblings.findIndex((p) => p.id === id);
    if (sibIdx === -1 || sibIdx === currentSiblings.length - 1) return;

    const nextSibling = currentSiblings[sibIdx + 1];
    const nextGlobalIdx = pages.findIndex((p) => p.id === nextSibling.id);

    const nextPages = [...pages];
    [nextPages[targetIdx], nextPages[nextGlobalIdx]] = [nextPages[nextGlobalIdx], nextPages[targetIdx]];

    syncWithDatabase(nextPages.map((p, idx) => ({ ...p, sort_order: idx })));
  };

  const moveItemOut = (id: string) => {
    const nextPages = pages.map((p) => {
      if (p.id !== id) return p;
      const parentFolder = pages.find((pf) => pf.id === p.parent_id);
      return { ...p, parent_id: parentFolder ? parentFolder.parent_id : null };
    });
    syncWithDatabase(nextPages.map((p, idx) => ({ ...p, sort_order: idx })));
  };

  const moveItemIn = (id: string) => {
    const targetIdx = pages.findIndex((p) => p.id === id);
    const currentSiblings = pages.filter((p) => p.parent_id === pages[targetIdx].parent_id);
    const sibIdx = currentSiblings.findIndex((p) => p.id === id);
    if (sibIdx <= 0) return;

    const prevSibling = currentSiblings[sibIdx - 1];
    if (!prevSibling.is_folder) return;

    const nextPages = pages.map((p) => (p.id === id ? { ...p, parent_id: prevSibling.id } : p));
    syncWithDatabase(nextPages.map((p, idx) => ({ ...p, sort_order: idx })));
  };

  return {
    pages,
    selectedPageId,
    setSelectedPageId,
    createPage: (name: string, parentId: string | null = null) => createItem(name, false, parentId),
    createFolder: (name: string, parentId: string | null = null) => createItem(name, true, parentId),
    updateItemName,
    deleteItem,
    moveItemUp,
    moveItemDown,
    moveItemOut,
    moveItemIn,
    isLoading
  };
};