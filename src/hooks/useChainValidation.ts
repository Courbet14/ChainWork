import { useCallback } from 'react';
import type { Task } from '../types';

// DAG (有向非巡回グラフ) における循環参照を検知するフック
export const useChainValidation = (tasks: Task[]) => {
  const validateConnection = useCallback((
    targetPrevId: string | 'HEAD' | null | undefined,
    currentTaskId: string | null
  ): boolean => {
    // ルートノードや未設定の場合は安全
    if (!targetPrevId || targetPrevId === 'HEAD') return true;
    // 自分自身を親にはできない
    if (targetPrevId === currentTaskId) return false;

    let currentCheckId: string | null = targetPrevId;
    const visited = new Set<string>();

    // 祖先を辿り、自分自身が現れないか（サイクルがないか）を検証する
    while (currentCheckId) {
      if (visited.has(currentCheckId)) return false;
      visited.add(currentCheckId);

      if (currentCheckId === currentTaskId) {
        return false;
      }

      const prevTask = tasks.find(t => t.id === currentCheckId);
      currentCheckId = prevTask ? prevTask.prev_task_id : null;
    }

    return true;
  }, [tasks]);

  return { validateConnection };
};