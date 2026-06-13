import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ルームの基本情報と認証状態を管理するフック
export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ルーム情報と認証状態の初期取得
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);

    try {
      // ルームの基本情報を取得
      const { data: roomData} = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', roomId)
        .maybeSingle();

      setRoom(roomData);

      if (roomData) {
        // ユーザーがルームのメンバーか確認
        const { data: memberData } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('room_id', roomId)
          .maybeSingle();

        if (memberData) {
          setIsAuth(true);
        } else {
          // メンバーでない場合、パスワードなしの部屋かチェック
          const { data: isSuccess } = await supabase.rpc('join_room', { 
            p_room_id: roomId, 
            p_password: '' 
          });
          if (isSuccess) setIsAuth(true);
        }

        // 閲覧履歴をローカルストレージに保存 (最大5件)
        const historyRaw = localStorage.getItem('chainwork_room_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const filtered = history.filter((h: any) => h.id !== roomId);
        const newHistory = [
          { id: roomId, name: roomData.name || roomId, accessedAt: Date.now() },
          ...filtered
        ];
        localStorage.setItem('chainwork_room_history', JSON.stringify(newHistory.slice(0, 5)));
      }
    } catch (err) {
      console.error('Room fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // パスワード認証の実行
  const verifyPassword = async (input: string) => {
    const { data: isSuccess, error } = await supabase.rpc('join_room', { 
      p_room_id: roomId, 
      p_password: input 
    });

    if (error) {
      console.error('Auth error:', error);
      return false;
    }

    if (isSuccess) {
      setIsAuth(true);
      return true;
    }
    return false;
  };

  // 複製許可の切り替え
  const toggleCopyable = async (allowed: boolean) => {
    if (!roomId) return;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_copyable: allowed })
        .eq('id', roomId);

      if (error) throw error;
      setRoom((prev: any) => prev ? { ...prev, is_copyable: allowed } : null);
    } catch (err) { 
      console.error('Toggle copyable error:', err); 
    }
  };

  // ルーム情報の更新 (環境設定)
  const updateRoom = async (newName: string, newPassword: string | null) => {
    if (!roomId) return false;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ 
          name: newName.trim(), 
          edit_password: newPassword?.trim() || null 
        })
        .eq('id', roomId);

      if (error) throw error;
      
      setRoom((prev: any) => prev ? { ...prev, name: newName.trim() } : null);
      if (!newPassword) setIsAuth(true);
      
      return true;
    } catch (err) { 
      console.error('Update room error:', err); 
      return false; 
    }
  };

  // ルーム全体のクローン作成
  const cloneWholeRoom = async (sourceRoomId: string, newRoomId: string) => {
    try {
      setIsLoading(true);

      // コピー元のルーム情報を取得・検証
      const { data: sourceRoom, error: roomError } = await supabase
        .from('rooms')
        .select('name, is_copyable')
        .eq('id', sourceRoomId)
        .single() as any;

      if (roomError || !sourceRoom) {
        alert('対象のルームが見つかりません。');
        return false;
      }
      if (!sourceRoom.is_copyable) {
        alert('このルームは管理者によってコピーが制限されています。');
        return false;
      }

      // カスタムフィールドの複製
      const { data: sourceFields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('room_id', sourceRoomId);

      if (!fieldsError && sourceFields && sourceFields.length > 0) {
        const newFields = sourceFields.map(f => ({
          room_id: newRoomId,
          field_key: f.field_key,
          label: f.label,
          field_type: f.field_type
        }));
        await supabase.from('form_fields').insert(newFields);
      }

      // ページ(フォルダ構造)の取得
      const { data: sourcePages, error: pagesError } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', sourceRoomId)
        .order('sort_order', { ascending: true });

      if (pagesError || !sourcePages || sourcePages.length === 0) {
        return true; 
      }

      // ルート要素のカウントを取得してソート順を決定
      const { data: currentRootItems } = await supabase
        .from('task_pages')
        .select('sort_order')
        .eq('room_id', newRoomId)
        .is('parent_id', null);
      
      const rootCount = currentRootItems ? currentRootItems.length : 0;

      // コピー先での大枠となるフォルダを作成
      const { data: wrapperFolder, error: wrapperErr } = await supabase
        .from('task_pages')
        .insert({
          room_id: newRoomId,
          name: sourceRoom.name,
          is_folder: true,
          parent_id: null,
          sort_order: rootCount
        })
        .select()
        .single();

      if (wrapperErr || !wrapperFolder) throw wrapperErr;

      // ページIDのマッピング (旧ID -> 新ID) を作成しながらツリーを再構築
      const pageIdMapping: { [oldId: string]: string } = {};
      const rootItems = sourcePages.filter(p => p.parent_id === null);
      
      for (const item of rootItems) {
        const { data: newRow, error: err } = await supabase
          .from('task_pages')
          .insert({
            room_id: newRoomId,
            name: item.name,
            is_folder: item.is_folder,
            parent_id: wrapperFolder.id,
            sort_order: item.sort_order
          })
          .select()
          .single();
        
        if (!err && newRow) pageIdMapping[item.id] = newRow.id;
      }

      let remainingPages = sourcePages.filter(p => p.parent_id !== null);
      let previousLength = remainingPages.length;

      // 階層が深い場合を考慮し、親が作成されたものから順次追加
      while (remainingPages.length > 0) {
        const injectable = remainingPages.filter(p => p.parent_id && pageIdMapping[p.parent_id]);
        
        for (const item of injectable) {
          const { data: newRow, error: err } = await supabase
            .from('task_pages')
            .insert({
              room_id: newRoomId,
              name: item.name,
              is_folder: item.is_folder,
              parent_id: pageIdMapping[item.parent_id!],
              sort_order: item.sort_order
            })
            .select()
            .single();

          if (!err && newRow) pageIdMapping[item.id] = newRow.id;
        }
        
        remainingPages = remainingPages.filter(p => !pageIdMapping[p.id]);
        if (remainingPages.length === previousLength) break;
        previousLength = remainingPages.length;
      }

      // タスクの複製
      const sourcePageIds = sourcePages.map(p => p.id);
      const { data: sourceTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('page_id', sourcePageIds);

      if (tasksError) throw tasksError;

      if (sourceTasks && sourceTasks.length > 0) {
        const taskIdMapping: { [oldId: string]: string } = {};
        const insertedTasks: any[] = [];

        // フェーズ1: タスク自体を先に全て挿入 (依存関係は一旦Null)
        for (const task of sourceTasks) {
          const nextNewPageId = pageIdMapping[task.page_id];
          if (!nextNewPageId) continue;

          const { data: newCtxTask, error: taskInsErr } = await supabase
            .from('tasks')
            .insert({
              room_id: newRoomId,
              page_id: nextNewPageId, 
              title: task.title,
              assignee: task.assignee,
              start_date: task.start_date,
              end_date: task.end_date,
              metadata: task.metadata, 
              prev_task_id: null       
            })
            .select()
            .single();

          if (!taskInsErr && newCtxTask) {
            taskIdMapping[task.id] = newCtxTask.id;
            insertedTasks.push({ oldTask: task, newId: newCtxTask.id });
          }
        }

        // フェーズ2: 新しいID同士で依存関係(prev_task_id, merged_task_ids)を結び直す
        for (const pair of insertedTasks) {
          const { oldTask, newId } = pair;
          let updatedPrevId: string | null = null;
          
          if (oldTask.prev_task_id && taskIdMapping[oldTask.prev_task_id]) {
            updatedPrevId = taskIdMapping[oldTask.prev_task_id];
          }

          const updatedMetadata = { ...oldTask.metadata };
          
          if (oldTask.metadata && Array.isArray(oldTask.metadata.merged_task_ids)) {
            const oldMergedIds: string[] = oldTask.metadata.merged_task_ids;
            updatedMetadata.merged_task_ids = oldMergedIds
              .map(oldMId => taskIdMapping[oldMId])
              .filter(newMId => !!newMId);
          }

          await supabase
            .from('tasks')
            .update({
              prev_task_id: updatedPrevId,
              metadata: updatedMetadata
            })
            .eq('id', newId);
        }
      }

      return true;
    } catch (err) {
      console.error('Clone error:', err);
      alert('複製処理中にエラーが発生しました。');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading };
};