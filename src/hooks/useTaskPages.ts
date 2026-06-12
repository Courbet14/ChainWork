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
          const mountedPages = linkedData.map(p => ({
            ...p,
            // 💡 リンク先のルート階層(!p.parent_id)のものは、リンクフォルダの直下に繋ぎ変える
            parent_id: !p.parent_id ? link.id : p.parent_id,
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
      const updates = nextPages.map(p => {
        let actualParentId = p.parent_id;
        // 💡 マウントされたアイテムを保存する際、リンクフォルダ直下のものはDB上ではnullに戻してあげる
        if (p.is_mounted) {
          const linkParent = nextPages.find(parent => parent.id === p.parent_id);
          if (linkParent && linkParent.target_room_id === p.room_id) {
            actualParentId = null;
          }
        }
        return {
          id: p.id,
          room_id: p.room_id,
          name: p.name,
          is_folder: p.is_folder,
          parent_id: actualParentId,
          sort_order: p.sort_order,
          target_room_id: p.target_room_id || null
        };
      });

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
      // 💡 挿入先のルームIDと親IDを賢く判定するロジック（クロスルーム対応）
      let targetInsertRoomId = roomId;
      let actualParentId = parentId;

      if (parentId) {
        const parentNode = pages.find(p => p.id === parentId);
        if (parentNode) {
          if (parentNode.is_mounted) {
            // リンク先のフォルダ内で作成した場合、リンク先のルームに保存
            targetInsertRoomId = parentNode.room_id;
          } else if (parentNode.target_room_id) {
            // 「リンクフォルダそのもの」の中に作成した場合、リンク先のルームのルート階層に保存
            targetInsertRoomId = parentNode.target_room_id;
            actualParentId = null;
          }
        }
      }

      // 挿入先ルームの要素数を取得してソート順を決定
      let query = supabase.from('task_pages').select('id').eq('room_id', targetInsertRoomId);
      if (actualParentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', actualParentId);
      }
      const { data: siblings } = await query;
      const siblingCount = siblings ? siblings.length : 0;

      const { data, error } = await supabase
        .from('task_pages')
        .insert([{ 
          room_id: targetInsertRoomId, 
          name: name.trim(), 
          is_folder: isFolder, 
          parent_id: actualParentId, 
          sort_order: siblingCount,
          target_room_id: targetRoomId
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 作成後は必ず再フェッチしてツリー全体を再構築する
      await fetchPages();
      
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
  const createLink = async (name: string, targetRoomId: string) => {
    if (!roomId || !name.trim() || !targetRoomId.trim()) return false;

    try {
      // まずパスワードなしでルームに参加（存在確認とパスワード不要部屋のチェック）できるか検証
      const { data: isSuccess } = await supabase.rpc('join_room', { 
        p_room_id: targetRoomId.trim(), 
        p_password: '' 
      });

      let authenticated = isSuccess;

      // パスワードなしで認証できなかった場合、パスワード入力を要求
      if (!authenticated) {
        const password = prompt('対象のワークスペースはパスワード保護されています。パスワードを入力してください:');
        if (password === null) return false; // キャンセル時

        const { data: isStrictSuccess } = await supabase.rpc('join_room', { 
          p_room_id: targetRoomId.trim(), 
          p_password: password 
        });
        
        if (!isStrictSuccess) {
          alert('パスワードが一致しないため、リンクを生成できません。');
          return false;
        }
      }

      // 認証が成功したため、リンクフォルダを作成
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
    createLink, // 💡 ここで上記の新しい関数を渡すようにします
    updateItemName,
    deleteItem,
    moveItemUp,
    moveItemDown,
    moveItemOut,
    moveItemIn,
    isLoading
  };
};