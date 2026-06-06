import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 💡 自動ログイン用のストレージキー
  const STORAGE_KEY = `chainwork_auth_${roomId}`;
  const LEASE_DURATION = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (error) throw error;
      setRoom(data);

      if (data) {
        // 1. パスワードがない部屋なら最初から編集・閲覧可能
        if (!data.edit_password) {
          setIsAuth(true);
        } else {
          // 2. 💡 自動ログインのチェック（24時間リース）
          const cachedAuth = localStorage.getItem(STORAGE_KEY);
          if (cachedAuth) {
            const { password, expiry } = JSON.parse(cachedAuth);
            // 期限内かつパスワードが一致しているか検証
            if (Date.now() < expiry && data.edit_password === password) {
              setIsAuth(true);
            } else {
              localStorage.removeItem(STORAGE_KEY); // 期限切れなら削除
            }
          }
        }

        // 3. 💡 履歴保存用：アクセスしたルームのIDと名前を履歴に記録（Home画面用）
        const historyRaw = localStorage.getItem('chainwork_room_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const filtered = history.filter((h: any) => h.id !== data.id); // 重複削除
        const newHistory = [{ id: data.id, name: data.name || data.id, accessedAt: Date.now() }, ...filtered];
        localStorage.setItem('chainwork_room_history', JSON.stringify(newHistory.slice(0, 5))); // 直近5件まで保存
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, STORAGE_KEY]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // 💡 パスワード検証 ＆ 24時間リース保存
  const verifyPassword = (input: string) => {
    if (room && room.edit_password === input) {
      setIsAuth(true);
      // 24時間の期限付きでパスワードを保存
      const authData = {
        password: input,
        expiry: Date.now() + LEASE_DURATION
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      return true;
    }
    return false;
  };

  const toggleCopyable = async (allowed: boolean) => {
    if (!roomId) return;
    try {
      const { error } = await supabase.from('rooms').update({ is_copyable: allowed }).eq('id', roomId);
      if (error) throw error;
      setRoom((prev: any) => prev ? { ...prev, is_copyable: allowed } : null);
    } catch (err) { console.error(err); }
  };

  const updateRoom = async (newName: string, newPassword: string | null) => {
    if (!roomId) return false;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ name: newName.trim(), edit_password: newPassword ? newPassword.trim() || null : null })
        .eq('id', roomId);
      if (error) throw error;
      
      setRoom((prev: any) => prev ? { ...prev, name: newName.trim(), edit_password: newPassword ? newPassword.trim() || null : null } : null);
      if (!newPassword) {
        setIsAuth(true);
        localStorage.removeItem(STORAGE_KEY);
      }
      return true;
    } catch (err) { console.error(err); return false; }
  };

  const cloneWholeRoom = async (sourceId: string, targetId: string) => {
    // 既存のcloneロジック（そのまま維持）
    try {
      const { data: sourceRoom } = await supabase.from('rooms').select('*').eq('id', sourceId).maybeSingle();
      if (!sourceRoom || !sourceRoom.is_copyable) { alert('指定されたルームは存在しないか、コピーが許可されていません。'); return false; }
      await supabase.from('rooms').insert([{ id: targetId, name: `${sourceRoom.name} (Copy)`, is_copyable: false, edit_password: null }]);
      const { data: sourcePages } = await supabase.from('task_pages').select('*').eq('room_id', sourceId);
      if (sourcePages && sourcePages.length > 0) {
        for (const page of sourcePages) {
          const { data: newPage } = await supabase.from('task_pages').insert([{ room_id: targetId, name: page.name }]).select().single();
          if (newPage) {
            const { data: sourceTasks } = await supabase.from('tasks').select('*').eq('page_id', page.id);
            if (sourceTasks && sourceTasks.length > 0) {
              const idMapping: Record<string, string> = {};
              for (const t of sourceTasks) {
                const { data: nTask } = await supabase.from('tasks').insert([{ page_id: newPage.id, title: t.title, assignee: t.assignee, start_date: t.start_date, end_date: t.end_date, metadata: t.metadata }]).select().single();
                if (nTask) idMapping[t.id] = nTask.id;
              }
              const { data: newTasks } = await supabase.from('tasks').select('*').eq('page_id', newPage.id);
              if (newTasks) {
                for (const nt of newTasks) {
                  const originalTask = sourceTasks.find(st => st.title === nt.title);
                  let updatedPrevId = originalTask?.prev_task_id && idMapping[originalTask.prev_task_id] ? idMapping[originalTask.prev_task_id] : null;
                  let updatedMeta = { ...nt.metadata };
                  if (updatedMeta.merged_task_ids && Array.isArray(updatedMeta.merged_task_ids)) {
                    updatedMeta.merged_task_ids = updatedMeta.merged_task_ids.map((oldId: string) => idMapping[oldId]).filter(Boolean);
                  }
                  await supabase.from('tasks').update({ prev_task_id: updatedPrevId, metadata: updatedMeta }).eq('id', nt.id);
                }
              }
            }
          }
        }
      }
      const { data: sourceFields } = await supabase.from('form_fields').select('*').eq('room_id', sourceId);
      if (sourceFields && sourceFields.length > 0) {
        await supabase.from('form_fields').insert(sourceFields.map(f => ({ room_id: targetId, label: f.label, field_type: f.field_type, field_key: f.field_key })));
      }
      return true;
    } catch (err) { console.error(err); return false; }
  };

  return { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading };
};