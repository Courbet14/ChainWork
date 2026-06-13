import { useMemo } from 'react';
import type { Task } from '../../../types';

export type Position = { x: number; y: number };
export type PositionMap = Record<string, Position>;

export const useWorkspaceLayout = (tasks: Task[]) => {
  const { positions, canvasWidth, canvasHeight } = useMemo(() => {
    const map: PositionMap = {};
    if (!tasks || tasks.length === 0) {
      return { positions: map, canvasWidth: 800, canvasHeight: 600 };
    }

    const childrenMap: Record<string, string[]> = {};
    const rootIds: string[] = [];

    tasks.forEach((t) => {
      childrenMap[t.id] = [];
    });

    tasks.forEach((t) => {
      if (t.prev_task_id && childrenMap[t.prev_task_id]) {
        childrenMap[t.prev_task_id].push(t.id);
      } else {
        rootIds.push(t.id);
      }
    });

    const levelCounts: Record<number, number> = {};
    
    const calculateCoords = (id: string, currentLevel: number) => {
      levelCounts[currentLevel] = (levelCounts[currentLevel] || 0);

      const xSpacing = 220;
      const xOffset = 50 + levelCounts[currentLevel] * xSpacing;
      
      const ySpacing = 200;
      const yOffset = 40 + currentLevel * ySpacing;

      map[id] = { x: xOffset, y: yOffset };
      levelCounts[currentLevel]++;

      if (childrenMap[id]) {
        childrenMap[id].forEach((childId) => calculateCoords(childId, currentLevel + 1));
      }
    };

    rootIds.forEach((rootId) => calculateCoords(rootId, 0));

    let maxX = 0;
    let maxY = 0;
    Object.values(map).forEach(pos => {
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y > maxY) maxY = pos.y;
    });

    return { 
      positions: map, 
      canvasWidth: Math.max(maxX + 300, window.innerWidth - 320),
      canvasHeight: Math.max(maxY + 300, window.innerHeight - 200)
    };
  }, [tasks]);

  return { positions, canvasWidth, canvasHeight };
};