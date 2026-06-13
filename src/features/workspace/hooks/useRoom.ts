import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);

    try {
      const { data: roomData} = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', roomId)
        .maybeSingle();

      setRoom(roomData);

      if (roomData) {
        const { data: memberData } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('room_id', roomId)
          .maybeSingle();

        if (memberData) {
          setIsAuth(true);
        } else {
          const { data: isSuccess } = await supabase.rpc('join_room', { 
            p_room_id: roomId, 
            p_password: '' 
          });
          if (isSuccess) setIsAuth(true);
        }

        const historyRaw = localStorage.getItem('chainwork_room_history');
        let history = historyRaw ? JSON.parse(historyRaw) : [];
        history = history.filter((h: any) => h.id !== roomId);
        history.unshift({ id: roomId, name: roomData.name, accessedAt: Date.now() });
        if (history.length > 5) history = history.slice(0, 5);
        localStorage.setItem('chainwork_room_history', JSON.stringify(history));
      }
    } catch (err) {
      console.error('Fetch room error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const verifyPassword = async (password: string) => {
    if (!roomId) return false;
    const { data: isSuccess } = await supabase.rpc('join_room', { 
      p_room_id: roomId, 
      p_password: password 
    });
    if (isSuccess) {
      setIsAuth(true);
      return true;
    }
    return false;
  };

  const toggleCopyable = async (allowed: boolean) => {
    if (!roomId) return;
    const { error } = await supabase
      .from('rooms')
      .update({ is_copyable: allowed })
      .eq('id', roomId);
    if (!error && room) {
      setRoom({ ...room, is_copyable: allowed });
    }
  };

  const updateRoom = async (newName: string, newPassword: string | null) => {
    if (!roomId) return false;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ name: newName, edit_password: newPassword })
        .eq('id', roomId);
        
      if (error) throw error;
      setRoom({ ...room, name: newName });
      return true;
    } catch (err) {
      console.error('Update room error:', err);
      return false;
    }
  };

  const cloneWholeRoom = async (sourceRoomId: string, newRoomId: string) => {
    try {
      const { data: sourceRoom, error: roomCheckErr } = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', sourceRoomId)
        .maybeSingle();

      if (roomCheckErr || !sourceRoom) return false;
      if (!sourceRoom.is_copyable) return false;

      const { data: pagesData } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', sourceRoomId);

      const pageIdMapping: Record<string, string> = {};

      if (pagesData && pagesData.length > 0) {
        for (const page of pagesData) {
          const { data: newPageData, error: pageInsErr } = await supabase
            .from('task_pages')
            .insert([{ 
              room_id: newRoomId, 
              name: page.name, 
              is_folder: page.is_folder,
              parent_id: page.parent_id ? pageIdMapping[page.parent_id] || null : null,
              sort_order: page.sort_order,
              target_room_id: page.target_room_id
            }])
            .select()
            .single();
            
          if (!pageInsErr && newPageData) {
            pageIdMapping[page.id] = newPageData.id;
          }
        }
      }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('room_id', sourceRoomId);

      const taskIdMapping: Record<string, string> = {};

      if (tasksData && tasksData.length > 0) {
        const insertedTasks: { oldTask: any, newId: string }[] = [];

        for (const task of tasksData) {
          const newPageId = task.page_id ? pageIdMapping[task.page_id] : null;

          const { data: newCtxTask, error: taskInsErr } = await supabase
            .from('tasks')
            .insert([{
              room_id: newRoomId,
              page_id: newPageId,
              title: task.title,
              assignee: task.assignee,
              start_date: task.start_date,
              end_date: task.end_date,
              metadata: task.metadata
            }])
            .select()
            .single();

          if (!taskInsErr && newCtxTask) {
            taskIdMapping[task.id] = newCtxTask.id;
            insertedTasks.push({ oldTask: task, newId: newCtxTask.id });
          }
        }

        for (const pair of insertedTasks) {
          const { oldTask, newId } = pair;
          let updatedPrevId: string | null = null;
          
          if (oldTask.prev_task_id && taskIdMapping[oldTask.prev_task_id]) {
            updatedPrevId = taskIdMapping[oldTask.prev_task_id];
          }

          const updatedMetadata = { ...oldTask.metadata };
          
          if (oldTask.metadata && Array.isArray(oldTask.metadata.merged_task_ids)) {
            const oldMergedIds: string[] = oldTask.metadata.merged_task_ids;
            updatedMetadata.merged_task_ids = oldMergedIds
              .map(oldMId => taskIdMapping[oldMId])
              .filter(newMId => !!newMId);
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
    }
  };

  return { 
    room, 
    isAuth, 
    isLoading, 
    verifyPassword, 
    toggleCopyable, 
    updateRoom, 
    cloneWholeRoom 
  };
};