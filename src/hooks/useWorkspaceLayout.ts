import { useMemo } from 'react';
import type { Task } from '../types';

export type Position = { x: number; y: number };
export type PositionMap = Record<string, Position>;

export const useWorkspaceLayout = (tasks: Task[]) => {
  const { positions, canvasWidth, canvasHeight } = useMemo(() => {
    const map: PositionMap = {};
    if (!tasks || tasks.length === 0) {
      return { positions: map, canvasWidth: 800, canvasHeight: 600 };
    }

    // 1. 隣接リスト（ツリー構造）の構築
    const childrenMap: Record<string, string[]> = {};
    const rootIds: string[] = [];
    const taskDict: Record<string, Task> = {};

    tasks.forEach((t) => {
      taskDict[t.id] = t;
      childrenMap[t.id] = [];
    });

    tasks.forEach((t) => {
      if (t.prev_task_id && childrenMap[t.prev_task_id]) {
        childrenMap[t.prev_task_id].push(t.id);
      } else {
        // 親がいない、または親が現在のページに存在しない場合は「起源（ルート）」として扱う
        rootIds.push(t.id);
      }
    });

    // 2. 深さ優先探索 (DFS) による階層（縦位置）と兄弟（横位置）の計測
    const levelCounts: Record<number, number> = {};
    
    const calculateCoords = (id: string, currentLevel: number) => {
      if (!levelCounts[currentLevel]) {
        levelCounts[currentLevel] = 0;
      }

      // 横位置（X軸）: 同じ階層にいるタスクの数に応じて等間隔に配置
      const xSpacing = 220; // カードの幅 + 余白
      const xOffset = 50 + levelCounts[currentLevel] * xSpacing;
      
      // 縦位置（Y軸）: 階層（深さ）が深くなるほど下へ配置
      const ySpacing = 200; // 階層ごとの縦の余白
      const yOffset = 40 + currentLevel * ySpacing;

      map[id] = { x: xOffset, y: yOffset };
      levelCounts[currentLevel]++;

      // 子ノード（分岐したタスク）を再帰的に配置
      if (childrenMap[id]) {
        childrenMap[id].forEach((childId) => {
          calculateCoords(childId, currentLevel + 1);
        });
      }
    };

    // すべての起源ノードから配置を開始
    rootIds.forEach((rootId) => {
      calculateCoords(rootId, 0);
    });

    // 3. スクロール領域（キャンバスサイズ）の動的計算
    const maxLevel = Object.keys(levelCounts).length;
    const maxItemsInLevel = Math.max(...Object.values(levelCounts), 1);

    const calculatedWidth = Math.max(maxItemsInLevel * 240 + 100, 1000);
    const calculatedHeight = Math.max(maxLevel * 220 + 200, 700);

    return {
      positions: map,
      canvasWidth: calculatedWidth,
      canvasHeight: calculatedHeight,
    };
  }, [tasks]);

  return { positions, canvasWidth, canvasHeight };
};