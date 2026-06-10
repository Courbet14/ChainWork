import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 🗑️ ローカルストレージ関連の変数を全削除！

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', roomId)
        .maybeSingle();

      setRoom(data);

      if (data) {
        const { data: memberData } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('room_id', roomId)
          .maybeSingle();

        if (memberData) {
          setIsAuth(true);
        } else {
          const { data: isSuccess } = await supabase.rpc('join_room', { p_room_id: roomId, p_password: '' });
          if (isSuccess) setIsAuth(true);
        }
        const historyRaw = localStorage.getItem('chainwork_room_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const filtered = history.filter((h: any) => h.id !== roomId);
        const newHistory = [{ id: roomId, name: data.name || roomId, accessedAt: Date.now() }, ...filtered];
        localStorage.setItem('chainwork_room_history', JSON.stringify(newHistory.slice(0, 5)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const verifyPassword = async (input: string) => {
    const { data: isSuccess, error } = await supabase.rpc('join_room', { 
      p_room_id: roomId, 
      p_password: input 
    });

    if (error) {
      console.error('Auth error:', error);
      return false;
    }

    if (isSuccess) {
      setIsAuth(true);
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
        .update({ name: newName.trim(), edit_password: newPassword?.trim() || null })
        .eq('id', roomId);
      if (error) throw error;
      
      setRoom((prev: any) => prev ? { ...prev, name: newName.trim() } : null);
      if (!newPassword) {
        setIsAuth(true);
      }
      return true;
    } catch (err) { console.error(err); return false; }
  };

  const cloneWholeRoom = async (sourceRoomId: string, newRoomId: string) => {
    try {
      setIsLoading(true);

      const { data: sourceRoom, error: roomError } = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', sourceRoomId)
        .single() as any;

      if (roomError || !sourceRoom) {
        alert('対象のルームが見つかりません。');
        return false;
      }

      if (sourceRoom && !sourceRoom.is_copyable) {
        alert('このルームは管理者によってコピーが制限されています。');
        return false;
      }

      const { data: sourceFields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('room_id', sourceRoomId);

      if (!fieldsError && sourceFields && sourceFields.length > 0) {
        const newFields = sourceFields.map(f => ({
          room_id: newRoomId,
          field_key: f.field_key,
          label: f.label,
          field_type: f.field_type
        }));
        await supabase.from('form_fields').insert(newFields);
      }

      const { data: sourcePages, error: pagesError } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', sourceRoomId)
        .order('sort_order', { ascending: true });

      if (pagesError || !sourcePages || sourcePages.length === 0) {
        return true; 
      }

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
          name: sourceRoom.name,
          is_folder: true,
          parent_id: null,
          sort_order: rootCount
        })
        .select()
        .single();

      if (wrapperErr || !wrapperFolder) throw wrapperErr;

      const pageIdMapping: { [oldId: string]: string } = {};
      const rootItems = sourcePages.filter(p => p.parent_id === null);
      
      for (const item of rootItems) {
        const { data: newRow, error: err } = await supabase
          .from('task_pages')
          .insert({
            room_id: newRoomId,
            name: item.name,
            is_folder: item.is_folder,
            parent_id: wrapperFolder.id,
            sort_order: item.sort_order
          })
          .select()
          .single();
        
        if (err) continue;
        if (newRow) pageIdMapping[item.id] = newRow.id;
      }

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

          if (err) continue;
          if (newRow) pageIdMapping[item.id] = newRow.id;
        }
        remainingPages = remainingPages.filter(p => !pageIdMapping[p.id]);
        if (remainingPages.length === previousLength) break;
        previousLength = remainingPages.length;
      }

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

          if (taskInsErr) continue;

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
      alert('複製処理中にエラーが発生しました。');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading };
};