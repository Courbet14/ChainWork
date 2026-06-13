import { useMemo } from 'react';
import type { Task } from '../../../types';

export const useCriticalPath = (tasks: Task[]) => {
  const criticalPathIds = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const getDuration = (task: Task) => {
      if (!task.start_date || !task.end_date) return 1;
      const start = new Date(task.start_date).getTime();
      const end = new Date(task.end_date).getTime();
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? days : 1;
    };

    const childrenMap = new Map<string, string[]>();
    const taskMap = new Map<string, Task>();

    tasks.forEach(task => {
      taskMap.set(task.id, task);
      if (!childrenMap.has(task.id)) childrenMap.set(task.id, []);
      
      if (task.prev_task_id) {
        if (!childrenMap.has(task.prev_task_id)) {
          childrenMap.set(task.prev_task_id, []);
        }
        childrenMap.get(task.prev_task_id)!.push(task.id);
      }
    });

    const memo = new Map<string, { totalDuration: number; nextNode: string | null }>();

    const dfs = (nodeId: string): { totalDuration: number; nextNode: string | null } => {
      if (memo.has(nodeId)) return memo.get(nodeId)!;

      const task = taskMap.get(nodeId);
      if (!task) return { totalDuration: 0, nextNode: null };

      const duration = getDuration(task);
      const children = childrenMap.get(nodeId) || [];

      if (children.length === 0) {
        const result = { totalDuration: duration, nextNode: null };
        memo.set(nodeId, result);
        return result;
      }

      let maxChildDuration = -1;
      let bestNextNode: string | null = null;

      for (const childId of children) {
        const childResult = dfs(childId);
        if (childResult.totalDuration > maxChildDuration) {
          maxChildDuration = childResult.totalDuration;
          bestNextNode = childId;
        }
      }

      const result = {
        totalDuration: duration + maxChildDuration,
        nextNode: bestNextNode,
      };
      memo.set(nodeId, result);
      return result;
    };

    let globalMaxDuration = -1;
    let startNode: string | null = null;
    const rootNodes = tasks.filter(t => !t.prev_task_id).map(t => t.id);
    const startPoints = rootNodes.length > 0 ? rootNodes : tasks.map(t => t.id);

    for (const nodeId of startPoints) {
      const result = dfs(nodeId);
      if (result.totalDuration > globalMaxDuration) {
        globalMaxDuration = result.totalDuration;
        startNode = nodeId;
      }
    }

    const path: string[] = [];
    let current = startNode;
    while (current) {
      path.push(current);
      const nextInfo = memo.get(current);
      current = nextInfo ? nextInfo.nextNode : null;
    }

    return path;
  }, [tasks]);

  return { criticalPathIds };
};