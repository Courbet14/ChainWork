import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type TaskPageItem = {
  id: string;
  room_id: string;
  name: string;
  is_folder: boolean;
  parent_id: string | null;
  sort_order: number;
  target_room_id?: string | null;
  is_mounted?: boolean;
};

export const useTaskPages = (roomId: string | undefined) => {
  const [pages, setPages] = useState<TaskPageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPages = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);

    try {
      // 1. 現在のルームのページを取得
      const { data: baseData, error } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', roomId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const basePages = (baseData || []) as TaskPageItem[];
      
      // 2. リンク設定がされているフォルダを探す
      const linkItems = basePages.filter(p => p.target_room_id);
      let allPages = [...basePages];

      // 3. リンク先のルームのページを取得し、現在のツリーにマウント（結合）する
      for (const link of linkItems) {
        if (!link.target_room_id) continue;
        const { data: linkedData } = await supabase
          .from('task_pages')
          .select('*')
          .eq('room_id', link.target_room_id)
          .order('sort_order', { ascending: true });

        if (linkedData) {
          const mountedPages = linkedData.map(p => ({
            ...p,
            // リンク先のルート階層のものは、リンクフォルダの直下に繋ぎ変える
            parent_id: p.parent_id === null ? link.id : p.parent_id,
            is_mounted: true
          }));
          allPages = [...allPages, ...mountedPages];
        }
      }

      setPages(allPages);
      
      setSelectedPageId((prev) => {
        if (prev && allPages.some((p) => p.id === prev && !p.is_folder)) return prev;
        const firstPage = allPages.find((p) => !p.is_folder);
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

  const syncWithDatabase = async (nextPages: TaskPageItem[]) => {
    setPages(nextPages);
    try {
      const updates = nextPages
        .filter(p => !p.is_mounted)
        .map(({ id, room_id, name, is_folder, parent_id, sort_order, target_room_id }) => ({
          id, room_id, name, is_folder, parent_id, sort_order, target_room_id
        }));
      if (updates.length > 0) {
        await supabase.from('task_pages').upsert(updates);
      }
    } catch (err) {
      console.error('Database sync error:', err);
    }
  };

  const createItem = async (name: string, isFolder: boolean, parentId: string | null = null, targetRoomId: string | null = null) => {
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
          sort_order: siblingCount,
          target_room_id: targetRoomId
        }])
        .select()
        .single();

      if (error) throw error;
      
      setPages((prev) => [...prev, data]);
      if (!isFolder) setSelectedPageId(data.id);
      
      if (targetRoomId) {
        fetchPages();
      }
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

  const moveItemUp = (id: string) => { /* 既存のまま維持 (省略せず元コードを使用) */
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

  const moveItemDown = (id: string) => { /* 既存のまま維持 */
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

  const moveItemOut = (id: string) => { /* 既存のまま維持 */
    const nextPages = pages.map((p) => {
      if (p.id !== id) return p;
      const parentFolder = pages.find((pf) => pf.id === p.parent_id);
      return { ...p, parent_id: parentFolder ? parentFolder.parent_id : null };
    });
    syncWithDatabase(nextPages.map((p, idx) => ({ ...p, sort_order: idx })));
  };

  const moveItemIn = (id: string) => { /* 既存のまま維持 */
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
    createLink: (name: string, targetRoomId: string) => createItem(name, true, null, targetRoomId),
    updateItemName,
    deleteItem,
    moveItemUp,
    moveItemDown,
    moveItemOut,
    moveItemIn,
    isLoading
  };
};