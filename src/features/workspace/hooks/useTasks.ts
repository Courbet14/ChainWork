import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// 💡 ステータスの型を定義
export type TaskStatus = '未着手' | '着手中' | '終了';

// 💡 metadata の中身を厳格かつ柔軟に定義（ここが根本原因の解決策です）
export type TaskMetadata = {
  status?: TaskStatus;
  merged_task_ids?: string[];
  [key: string]: any; // カスタム拡張フォームの動的プロパティも許容する
};

export type Task = {
  id: string;
  room_id: string;
  page_id: string;
  prev_task_id: string | null;
  title: string;
  assignee: string | null;
  start_date: string | null;
  end_date: string | null;
  metadata: TaskMetadata; // ★ 定義した型を適用
  created_at: string;
};

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

    if (!error && data) {
      setTasks(data as Task[]); // 型をキャストして安全に格納
    }
  }, [pageId]);

  const addTask = async ({
    roomId,
    title,
    assignee,
    startDate,
    endDate,
    metadata,
    chosenPrevTaskId
  }: {
    roomId: string;
    title: string;
    assignee: string;
    startDate: string;
    endDate: string;
    metadata: TaskMetadata;
    chosenPrevTaskId: string | null;
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
          metadata,
        },
      ]);

      if (error) throw error;
    } catch (err) {
      console.error('タスク追加エラー:', err);
      alert('タスクの追加に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('更新エラー:', err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await supabase.from('tasks').update({ prev_task_id: null }).eq('prev_task_id', id);
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      console.error('削除エラー:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (!pageId) return;

    const uniqueId = Math.random().toString(36).substring(2, 15);
    const channel = supabase
      .channel(`realtime-tasks-${pageId}-${uniqueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `page_id=eq.${pageId}` },
        () => { fetchTasks(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pageId, fetchTasks]);

  return { tasks, addTask, updateTask, deleteTask, isLoading };
};