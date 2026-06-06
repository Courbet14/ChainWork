import { useCallback } from 'react';
import type { Task } from '../types';

export const useChainValidation = (tasks: Task[]) => {
  /**
   * 💡 指定した接続（targetPrevId -> currentTaskId）が循環参照（ループ）を起こさないか検証する
   * @param targetPrevId 繋ごうとしている先行タスクのID（上流にしたいノードのID）
   * @param currentTaskId 現在追加・編集中のタスクID（新規作成時は null）
   * @returns 接続が安全なら true、ループが検知されたら false
   */
  const validateConnection = useCallback((
    targetPrevId: string | 'HEAD' | null | undefined, // 💡 undefined を許容するように拡張
    currentTaskId: string | null
  ): boolean => {
    // 💡 親がいない（null / undefined）または先頭（HEAD）への接続は絶対にループしないので安全
    if (targetPrevId === null || targetPrevId === undefined || targetPrevId === 'HEAD') return true;
    // 自己ループの禁止
    if (targetPrevId === currentTaskId) return false;

    let currentCheckId: string | null = targetPrevId;
    const visited = new Set<string>();

    // 先行タスクから親（prev_task_id）を上に上に辿る
    while (currentCheckId) {
      // 既存のデータ構造内にすでにループがある場合の無限ループ防止ガード
      if (visited.has(currentCheckId)) return false;
      visited.add(currentCheckId);

      // 遡った先で「自分自身」に到達したら、それは「下流のタスクを親にしようとしている」＝逆流ループ
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