import { useCallback } from 'react';
import type { Task } from '../../../types';

export const useChainValidation = (tasks: Task[]) => {
  const validateConnection = useCallback((
    targetPrevId: string | 'HEAD' | null | undefined,
    currentTaskId: string | null
  ): boolean => {
    if (!targetPrevId || targetPrevId === 'HEAD') return true;
    if (targetPrevId === currentTaskId) return false;

    let currentCheckId: string | null = targetPrevId;
    const visited = new Set<string>();

    while (currentCheckId) {
      if (visited.has(currentCheckId)) return false;
      visited.add(currentCheckId);

      if (currentCheckId === currentTaskId) return false;

      const prevTask = tasks.find(t => t.id === currentCheckId);
      currentCheckId = prevTask ? prevTask.prev_task_id : null;
    }

    return true;
  }, [tasks]);

  return { validateConnection };
};