import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

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
      const { data: baseData, error } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', roomId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const basePages = (baseData || []) as TaskPageItem[];
      
      const linkItems = basePages.filter(p => p.target_room_id);
      let allPages = [...basePages];

      for (const link of linkItems) {
        if (!link.target_room_id) continue;
        const { data: linkedData } = await supabase
          .from('task_pages')
          .select('*')
          .eq('room_id', link.target_room_id)
          .order('sort_order', { ascending: true });
        
        if (linkedData) {
          // 💡 修正ポイント：ルート要素（parent_id が null）のみリンクの子にし、階層構造を維持する
          const mountedItems = linkedData.map(d => ({ 
            ...d, 
            parent_id: d.parent_id === null ? link.id : d.parent_id, 
            is_mounted: true 
          }));
          allPages = [...allPages, ...mountedItems];
        }
      }

      setPages(allPages);
      
      if (!selectedPageId && basePages.length > 0) {
        const firstPage = basePages.find(p => !p.is_folder);
        if (firstPage) setSelectedPageId(firstPage.id);
      }
    } catch (err) {
      console.error('Fetch pages error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, selectedPageId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const createItem = async (name: string, isFolder: boolean, parentId: string | null, targetRoomId: string | null = null) => {
    if (!roomId || !name.trim()) return;
    const maxOrder = pages.filter(p => p.parent_id === parentId).reduce((max, p) => p.sort_order > max ? p.sort_order : max, 0);

    try {
      const { data, error } = await supabase
        .from('task_pages')
        .insert([{ 
          room_id: roomId, 
          name: name.trim(), 
          is_folder: isFolder, 
          parent_id: parentId, 
          sort_order: maxOrder + 10,
          target_room_id: targetRoomId
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      if (!isFolder && !targetRoomId && data) {
        setSelectedPageId(data.id);
      }
      fetchPages();
    } catch (err) {
      console.error('Create item error:', err);
    }
  };

  const updateItemName = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from('task_pages').update({ name }).eq('id', id);
      if (error) throw error;
      setPages(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    } catch (err) {
      console.error('Rename item error:', err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const children = pages.filter(p => p.parent_id === id);
      for (const child of children) await deleteItem(child.id);
      const { error } = await supabase.from('task_pages').delete().eq('id', id);
      if (error) throw error;
      
      if (selectedPageId === id) setSelectedPageId(null);
      fetchPages();
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  const updateSortOrder = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase.from('task_pages').update({ sort_order: newOrder }).eq('id', id);
      if (error) throw error;
      fetchPages();
    } catch (err) {
      console.error('Update sort order error:', err);
    }
  };

  const moveItemUp = (id: string) => {
    const item = pages.find(p => p.id === id);
    if (!item) return;
    const siblings = pages.filter(p => p.parent_id === item.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = siblings.findIndex(p => p.id === id);
    if (currentIndex > 0) {
      const prevItem = siblings[currentIndex - 1];
      updateSortOrder(item.id, prevItem.sort_order - 5);
    }
  };

  const moveItemDown = (id: string) => {
    const item = pages.find(p => p.id === id);
    if (!item) return;
    const siblings = pages.filter(p => p.parent_id === item.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = siblings.findIndex(p => p.id === id);
    if (currentIndex < siblings.length - 1) {
      const nextItem = siblings[currentIndex + 1];
      updateSortOrder(item.id, nextItem.sort_order + 5);
    }
  };

  const moveItemOut = async (id: string) => {
    const item = pages.find(p => p.id === id);
    if (!item || !item.parent_id) return;
    try {
      const parent = pages.find(p => p.id === item.parent_id);
      const newParentId = parent ? parent.parent_id : null;
      const { error } = await supabase.from('task_pages').update({ parent_id: newParentId }).eq('id', id);
      if (error) throw error;
      fetchPages();
    } catch (err) {
      console.error('Move out error:', err);
    }
  };

  const moveItemIn = async (id: string) => {
    const item = pages.find(p => p.id === id);
    if (!item) return;
    const siblings = pages.filter(p => p.parent_id === item.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = siblings.findIndex(p => p.id === id);
    if (currentIndex > 0) {
      const prevItem = siblings[currentIndex - 1];
      if (prevItem.is_folder) {
        try {
          const { error } = await supabase.from('task_pages').update({ parent_id: prevItem.id }).eq('id', id);
          if (error) throw error;
          fetchPages();
        } catch (err) {
          console.error('Move in error:', err);
        }
      }
    }
  };

  const moveToFolder = async (id: string, targetParentId: string | null) => {
    try {
      const { error } = await supabase.from('task_pages').update({ parent_id: targetParentId }).eq('id', id);
      if (error) throw error;
      fetchPages();
    } catch (err) {
      console.error('Move to folder error:', err);
    }
  };

  const createLink = async (name: string, targetRoomId: string) => {
    if (!roomId || !name.trim() || !targetRoomId.trim()) return false;

    try {
      const { data: isSuccess } = await supabase.rpc('join_room', { 
        p_room_id: targetRoomId.trim(), 
        p_password: '' 
      });

      let authenticated = isSuccess;

      if (!authenticated) {
        const password = prompt('対象のワークスペースはパスワード保護されています。パスワードを入力してください:');
        if (password === null) return false;

        const { data: isStrictSuccess } = await supabase.rpc('join_room', { 
          p_room_id: targetRoomId.trim(), 
          p_password: password 
        });
        
        if (!isStrictSuccess) {
          alert('パスワードが一致しないため、リンクを生成できません。');
          return false;
        }
      }

      await createItem(name, true, null, targetRoomId.trim());
      return true;
    } catch (err) {
      console.error(err);
      alert('リンク先の認証処理中にエラーが発生しました。');
      return false;
    }
  };

  return {
    pages,
    selectedPageId,
    setSelectedPageId,
    createPage: (name: string, parentId: string | null = null) => createItem(name, false, parentId),
    createFolder: (name: string, parentId: string | null = null) => createItem(name, true, parentId),
    createLink,
    updateItemName,
    deleteItem,
    moveItemUp,
    moveItemDown,
    moveItemOut,
    moveItemIn,
    moveToFolder,
    isLoading
  };
};