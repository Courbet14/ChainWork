import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export type Task = {
  id: string;
  room_id: string;
  prev_task_id: string | null;
  title: string;
  assignee: string | null;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, any>;
  created_at: string;
  depth?: number; // ★ 分岐の深さを表すプロパティを追加
};

// 💡 分岐ツリーを解析し、さらに「開始日（start_date）の早い順」に兄弟をソートする関数
const sortTasksAsTree = (unorderedTasks: Task[]): Task[] => {
  if (unorderedTasks.length === 0) return [];

  // 親IDから子タスクのリストを引くマップ
  const childrenMap = new Map<string | null, Task[]>();
  unorderedTasks.forEach((task) => {
    const prev = task.prev_task_id;
    if (!childrenMap.has(prev)) {
      childrenMap.set(prev, []);
    }
    childrenMap.get(prev)!.push(task);
  });

  const sortedResult: Task[] = [];

  // 再帰的にツリーを探索
  const traverse = (parentId: string | null, currentDepth: number) => {
    const children = childrenMap.get(parentId) || [];
    
    // ★ ここが最大の変更点：分岐した子たちを「開始日（start_date）」の順にソートする
    children.sort((a, b) => {
      // 開始日がない場合は、無限の未来（Infinity）として扱い、後ろに回す
      const timeA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const timeB = b.start_date ? new Date(b.start_date).getTime() : Infinity;

      if (timeA !== timeB) {
        return timeA - timeB; // 日付が早い方が上
      }
      
      // もし開始日が全く同じ、または両方とも未入力の場合は、作成日時が古い順にする
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    children.forEach((child) => {
      sortedResult.push({ ...child, depth: currentDepth });
      traverse(child.id, currentDepth + 1); // さらに深く
    });
  };

  traverse(null, 0);

  // 孤立タスクの安全結合
  if (sortedResult.length < unorderedTasks.length) {
    const visitedIds = new Set(sortedResult.map((t) => t.id));
    unorderedTasks.forEach((task) => {
      if (!visitedIds.has(task.id)) {
        sortedResult.push({ ...task, depth: 0 });
      }
    });
  }

  return sortedResult;
};

export const useTasks = (roomId: string | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', roomId);

    if (!error && data) {
      // ★ 取得データをツリー順にソート
      setTasks(sortTasksAsTree(data));
    }
  }, [roomId]);

  const addTask = async (
    title: string,
    assignee: string,
    startDate: string,
    endDate: string,
    metadata: Record<string, any>,
    chosenPrevTaskId: string | null
  ) => {
    if (!roomId) return;
    setIsLoading(true);

    try {
      // ★ 分岐の設計では「割り込みのポインタ付け替え」は不要になります（複数のタスクが同じ親を持ってよいため）
      const { error } = await supabase.from('tasks').insert([
        {
          room_id: roomId,
          prev_task_id: chosenPrevTaskId, // 選んだ親タスクのIDをそのまま紐付け
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

  useEffect(() => {
    fetchTasks();
    if (!roomId) return;

    const uniqueId = Math.random().toString(36).substring(2, 15);
    const channel = supabase
      .channel(`realtime-tasks-${roomId}-${uniqueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `room_id=eq.${roomId}` },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchTasks]);

  return { tasks, addTask, isLoading };
};