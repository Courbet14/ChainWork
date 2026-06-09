import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const STORAGE_KEY = `chainwork_auth_${roomId}`;
  const LEASE_DURATION = 24 * 60 * 60 * 1000;

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (error) throw error;
      setRoom(data);

      if (data) {
        if (!data.edit_password) {
          setIsAuth(true);
        } else {
          const cachedAuth = localStorage.getItem(STORAGE_KEY);
          if (cachedAuth) {
            const { password, expiry } = JSON.parse(cachedAuth);
            if (Date.now() < expiry && data.edit_password === password) {
              setIsAuth(true);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }

        const historyRaw = localStorage.getItem('chainwork_room_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const filtered = history.filter((h: any) => h.id !== data.id);
        const newHistory = [{ id: data.id, name: data.name || data.id, accessedAt: Date.now() }, ...filtered];
        localStorage.setItem('chainwork_room_history', JSON.stringify(newHistory.slice(0, 5)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, STORAGE_KEY]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const verifyPassword = (input: string) => {
    if (room && room.edit_password === input) {
      setIsAuth(true);
      const authData = { password: input, expiry: Date.now() + LEASE_DURATION };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      return true;
    }
    return false;
  };

  const toggleCopyable = async (allowed: boolean) => {
    if (!roomId) return;
    try {
      const { error } = await supabase.from('rooms').update({ is_copyable: allowed }).eq('id', roomId);
      if (error) throw error;
      setRoom((prev: any) => prev ? { ...prev, is_copyable: allowed } : null);
    } catch (err) { console.error(err); }
  };

  const updateRoom = async (newName: string, newPassword: string | null) => {
    if (!roomId) return false;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ name: newName.trim(), edit_password: newPassword ? newPassword.trim() || null : null })
        .eq('id', roomId);
      if (error) throw error;
      
      setRoom((prev: any) => prev ? { ...prev, name: newName.trim(), edit_password: newPassword ? newPassword.trim() || null : null } : null);
      if (!newPassword) {
        setIsAuth(true);
        localStorage.removeItem(STORAGE_KEY);
      }
      return true;
    } catch (err) { console.error(err); return false; }
  };

  // 🚀 ルーム名フォルダを作成してその中に完全複製するロジック
  const cloneWholeRoom = async (sourceRoomId: string, newRoomId: string) => {
    try {
      setIsLoading(true);

      // 1. コピー元のルーム情報を取得
      const { data: sourceRoom, error: roomError } = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', sourceRoomId)
        .single() as any;

      if (roomError || !sourceRoom) {
        alert('❌ 対象のルームが見つかりません。');
        return false;
      }

      if (sourceRoom && !sourceRoom.is_copyable) {
        alert('🔒 このルームは管理者によって「配布コピー：禁止中」に設定されているため、複製できません。');
        return false;
      }

      // 2. コピー元の全ページ・フォルダ要素を取得
      const { data: sourcePages, error: pagesError } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', sourceRoomId)
        .order('sort_order', { ascending: true });

      if (pagesError || !sourcePages || sourcePages.length === 0) {
        return true; 
      }

      // 🎯 【新規追加】コピー先のルートに、受け皿となる「ルーム名の親フォルダ」を作成
      const { data: currentRootItems } = await supabase
        .from('task_pages')
        .select('sort_order')
        .eq('room_id', newRoomId)
        .is('parent_id', null);
      
      const rootCount = currentRootItems ? currentRootItems.length : 0;

      const { data: wrapperFolder, error: wrapperErr } = await supabase
        .from('task_pages')
        .insert({
          room_id: newRoomId,
          name: sourceRoom.name, // 💡 ここで元のルーム名をフォルダ名にする
          is_folder: true,
          parent_id: null,       // このフォルダ自体はルートに配置
          sort_order: rootCount
        })
        .select()
        .single();

      if (wrapperErr || !wrapperFolder) throw wrapperErr;

      // 古いページID -> 新しいページID の翻訳辞書マップ
      const pageIdMapping: { [oldId: string]: string } = {};

      // 3. 【ページ複製：パス1】元のルート要素を、さきほど作った「ルーム名フォルダ」の中にインサート
      const rootItems = sourcePages.filter(p => p.parent_id === null);
      for (const item of rootItems) {
        const { data: newRow, error: err } = await supabase
          .from('task_pages')
          .insert({
            room_id: newRoomId,
            name: item.name,
            is_folder: item.is_folder,
            parent_id: wrapperFolder.id, // 💡 nullではなく、wrapperFolder.id の中に格納！
            sort_order: item.sort_order
          })
          .select()
          .single();
        
        if (err) { console.error('Page Path1 error:', err); continue; }
        if (newRow) pageIdMapping[item.id] = newRow.id;
      }

      // 4. 【ページ複製：パス2】子・孫階層のフォルダ・ページをインサート（変更なし）
      let remainingPages = sourcePages.filter(p => p.parent_id !== null);
      let previousLength = remainingPages.length;

      while (remainingPages.length > 0) {
        const injectable = remainingPages.filter(p => p.parent_id && pageIdMapping[p.parent_id]);
        for (const item of injectable) {
          const { data: newRow, error: err } = await supabase
            .from('task_pages')
            .insert({
              room_id: newRoomId,
              name: item.name,
              is_folder: item.is_folder,
              parent_id: pageIdMapping[item.parent_id!],
              sort_order: item.sort_order
            })
            .select()
            .single();

          if (err) { console.error('Page Path2 error:', err); continue; }
          if (newRow) pageIdMapping[item.id] = newRow.id;
        }
        remainingPages = remainingPages.filter(p => !pageIdMapping[p.id]);
        if (remainingPages.length === previousLength) break;
        previousLength = remainingPages.length;
      }

      // 5. 【タスク複製】（変更なし）
      const sourcePageIds = sourcePages.map(p => p.id);
      const { data: sourceTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('page_id', sourcePageIds);

      if (tasksError) throw tasksError;

      if (sourceTasks && sourceTasks.length > 0) {
        const taskIdMapping: { [oldId: string]: string } = {};
        const insertedTasks: any[] = [];

        for (const task of sourceTasks) {
          const nextNewPageId = pageIdMapping[task.page_id];
          if (!nextNewPageId) continue;

          const { data: newCtxTask, error: taskInsErr } = await supabase
            .from('tasks')
            .insert({
              room_id: newRoomId,
              page_id: nextNewPageId, 
              title: task.title,
              assignee: task.assignee,
              start_date: task.start_date,
              end_date: task.end_date,
              metadata: task.metadata, 
              prev_task_id: null       
            })
            .select()
            .single();

          if (taskInsErr) {
            console.error('Task basic insert error:', taskInsErr);
            continue;
          }

          if (newCtxTask) {
            taskIdMapping[task.id] = newCtxTask.id;
            insertedTasks.push({ oldTask: task, newId: newCtxTask.id });
          }
        }

        for (const pair of insertedTasks) {
          const oldTask = pair.oldTask;
          const newId = pair.newId;

          let updatedPrevId: string | null = null;
          if (oldTask.prev_task_id && taskIdMapping[oldTask.prev_task_id]) {
            updatedPrevId = taskIdMapping[oldTask.prev_task_id];
          }

          let updatedMetadata = { ...oldTask.metadata };
          if (oldTask.metadata && Array.isArray(oldTask.metadata.merged_task_ids)) {
            const oldMergedIds: string[] = oldTask.metadata.merged_task_ids;
            const newMergedIds = oldMergedIds
              .map(oldMId => taskIdMapping[oldMId])
              .filter(newMId => !!newMId);

            updatedMetadata.merged_task_ids = newMergedIds;
          }

          await supabase
            .from('tasks')
            .update({
              prev_task_id: updatedPrevId,
              metadata: updatedMetadata
            })
            .eq('id', newId);
        }
      }

      return true;

    } catch (err) {
      console.error('Clone error:', err);
      alert('❌ 複製の作成中にエラーが発生しました。');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading };
};