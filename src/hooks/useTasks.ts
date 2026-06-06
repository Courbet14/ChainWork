import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, TaskMetadata } from '../types';

export const useTasks = (pageId: string | null) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!pageId) {
      setTasks([]);
      return;
    }
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('page_id', pageId);
    if (!error && data) setTasks(data as Task[]);
  }, [pageId]);

  const addTask = async ({
    roomId, title, assignee, startDate, endDate, metadata, chosenPrevTaskId
  }: {
    roomId: string; title: string; assignee: string; startDate: string; endDate: string; metadata: TaskMetadata; chosenPrevTaskId: string | null;
  }) => {
    if (!roomId || !pageId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert([
        {
          room_id: roomId,
          page_id: pageId,
          prev_task_id: chosenPrevTaskId,
          title,
          assignee: assignee || null,
          start_date: startDate || null,
          end_date: endDate || null,
          metadata
        }
      ]);
      if (error) throw error;
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await supabase.from('tasks').update({ prev_task_id: null }).eq('prev_task_id', id);
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (!pageId) return;
    const channel = supabase
      .channel(`realtime-tasks-${pageId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `page_id=eq.${pageId}` }, () => { fetchTasks(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pageId, fetchTasks]);

  return { tasks, addTask, updateTask, deleteTask, isLoading };
};