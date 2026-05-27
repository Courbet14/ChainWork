import { useMemo } from 'react';
import type { Task } from './useTasks';

export const useWorkspaceLayout = (tasks: Task[]) => {
  return useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const baseCanvasWidth = 1200; // 基準となるキャンバスの最低横幅

    if (tasks.length === 0) {
      return { positions, canvasHeight: 600, canvasWidth: baseCanvasWidth };
    }

    // 1. 根っこ（親なし）のタスクを一旦等間隔で仮配置
    const roots = tasks.filter((t) => t.prev_task_id === null);
    roots.forEach((task, idx) => {
      positions[task.id] = { x: idx * 280, y: 40 };
    });

    // 2. 幅優先探索（BFS）で依存関係順に下の階層へ配置
    const queue = [...roots];
    const visited = new Set<string>(roots.map((t) => t.id));
    let safetyCounter = 0;

    while (queue.length > 0 && safetyCounter < 1000) {
      safetyCounter++;
      const current = queue.shift()!;
      const children = tasks.filter((t) => t.prev_task_id === current.id && !visited.has(t.id));

      children.sort((a, b) => {
        const timeA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
        const timeB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
        return timeA - timeB;
      });

      children.forEach((child, index) => {
        const y = positions[current.id].y + 240; // カクカク線が見えやすいよう縦幅を少し広めに確保
        const mergedIds = child.metadata.merged_task_ids as string[] | undefined;

        if (mergedIds && Array.isArray(mergedIds) && mergedIds.length > 0) {
          const allParentIds = [child.prev_task_id, ...mergedIds].filter(Boolean);
          const settledParents = allParentIds.filter((id) => positions[id!]);

          if (settledParents.length > 0) {
            const sumX = settledParents.reduce((sum, id) => sum + positions[id!].x, 0);
            positions[child.id] = { x: sumX / settledParents.length, y };
          } else {
            positions[child.id] = { x: positions[current.id].x, y };
          }
        } else {
          const spacing = 200;
          const offset = (index - (children.length - 1) / 2) * spacing;
          positions[child.id] = { x: positions[current.id].x + offset, y };
        }

        visited.add(child.id);
        queue.push(child);
      });

      if (queue.length === 0 && visited.size < tasks.length) {
        const unvisited = tasks.find((t) => !visited.has(t.id));
        if (unvisited) {
          positions[unvisited.id] = { x: 0, y: 40 };
          visited.add(unvisited.id);
          queue.push(unvisited);
        }
      }
    }

    // =========================================================
    // 🔥 【新機能】ツリー全体の重心を割り出し、完全に中央へ寄せる
    // =========================================================
    const posArray = Object.values(positions);
    const minX = Math.min(...posArray.map((p) => p.x));
    const maxX = Math.max(...posArray.map((p) => p.x));
    const cardWidth = 160;
    const treeWidth = maxX - minX + cardWidth;

    // ツリーの大きさに合わせてキャンバスの横幅を動的に拡張
    const canvasWidth = Math.max(baseCanvasWidth, treeWidth + 300);

    // キャンバスの中心とツリーの中心のズレ（差分）を計算して全員スライド
    const treeCenter = (minX + maxX + cardWidth) / 2;
    const canvasCenter = canvasWidth / 2;
    const shiftX = canvasCenter - treeCenter;

    Object.keys(positions).forEach((id) => {
      positions[id].x += shiftX;
    });

    const canvasHeight = Math.max(...posArray.map((p) => p.y)) + 240;

    return { positions, canvasHeight, canvasWidth };
  }, [tasks]);
};