import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRoom = (roomId: string | undefined) => {
  const [room, setRoom] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const STORAGE_KEY = `chainwork_auth_${roomId}`;
  const LEASE_DURATION = 24 * 60 * 60 * 1000;

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
        if (!data.edit_password) {
          setIsAuth(true);
        } else {
          const cachedAuth = localStorage.getItem(STORAGE_KEY);
          if (cachedAuth) {
            const { password, expiry } = JSON.parse(cachedAuth);
            if (Date.now() < expiry && data.edit_password === password) {
              setIsAuth(true);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }

        const historyRaw = localStorage.getItem('chainwork_room_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const filtered = history.filter((h: any) => h.id !== data.id);
        const newHistory = [{ id: data.id, name: data.name || data.id, accessedAt: Date.now() }, ...filtered];
        localStorage.setItem('chainwork_room_history', JSON.stringify(newHistory.slice(0, 5)));
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

  const verifyPassword = (input: string) => {
    if (room && room.edit_password === input) {
      setIsAuth(true);
      const authData = { password: input, expiry: Date.now() + LEASE_DURATION };
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

 const cloneWholeRoom = async (sourceRoomId: string, currentRoomId: string) => {
    try {
      setIsLoading(true);

      // 1. コピー元（対象）のルーム情報を取得
      const { data: sourceRoom, error: roomError } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', sourceRoomId)
        .single();

      if (roomError || !sourceRoom) {
        alert('❌ 対象のルームが見つかりません。');
        return false;
      }

      // 2. コピー元（対象）の全ページ・フォルダ要素を取得
      const { data: sourcePages, error: pagesError } = await supabase
        .from('task_pages')
        .select('*')
        .eq('room_id', sourceRoomId)
        .order('sort_order', { ascending: true });

      if (pagesError || !sourcePages || sourcePages.length === 0) {
        alert('⚠️ 対象ルームに要素がないか、読み込めませんでした。');
        return false;
      }

      // 3. 現在のルームのルート直下にある要素数を取得して sort_order を決定
      const { data: currentRootItems, error: countError } = await supabase
        .from('task_pages')
        .select('sort_order')
        .eq('room_id', currentRoomId)
        .is('parent_id', null);

      const rootCount = currentRootItems ? currentRootItems.length : 0;

      // 4. 親フォルダ（パッケージフォルダ）を新規作成
      const { data: parentFolder, error: folderError } = await supabase
        .from('task_pages')
        .insert({
          room_id: currentRoomId,
          name: `📦 ${sourceRoom.name} のクローン`,
          is_folder: true,
          parent_id: null, // ルート直下に配置
          sort_order: rootCount
        })
        .select()
        .single();

      if (folderError || !parentFolder) throw folderError;

      // 古いUUID -> 新しいUUID の翻訳辞書
      const idMapping: { [oldId: string]: string } = {};

      // 5. 【パス1】元のルート要素（parent_id が null）を新フォルダの直下にインサート
      const rootItems = sourcePages.filter(p => p.parent_id === null);
      for (const item of rootItems) {
        // 💡 核心修正: id を含めず、必要なカラムだけをクリーンにインサートして 409 衝突を防ぐ
        const { data: newRow, error: err } = await supabase
          .from('task_pages')
          .insert({
            room_id: currentRoomId,
            name: item.name,
            is_folder: item.is_folder,
            parent_id: parentFolder.id, // 新設した親フォルダの中に入れる
            sort_order: item.sort_order
          })
          .select()
          .single();
        
        if (err) {
          console.error('Path1 insert error:', err);
          continue;
        }
        if (newRow) {
          idMapping[item.id] = newRow.id;
        }
      }

      // 6. 【パス2】子・孫階層の要素を、マッピングが解決したものから順にインサート
      let remainingPages = sourcePages.filter(p => p.parent_id !== null);
      let previousLength = remainingPages.length;

      while (remainingPages.length > 0) {
        const injectable = remainingPages.filter(p => p.parent_id && idMapping[p.parent_id]);
        
        for (const item of injectable) {
          const { data: newRow, error: err } = await supabase
            .from('task_pages')
            .insert({
              room_id: currentRoomId,
              name: item.name,
              is_folder: item.is_folder,
              parent_id: idMapping[item.parent_id!], // 新しい世界の親フォルダIDに置換
              sort_order: item.sort_order
            })
            .select()
            .single();

          if (err) {
            console.error('Path2 insert error:', err);
            continue;
          }
          if (newRow) {
            idMapping[item.id] = newRow.id;
          }
        }

        // 残った未処理の要素をフィルタリング
        remainingPages = remainingPages.filter(p => !idMapping[p.id]);
        
        // 無限ループ防止（処理件数に進捗がなければ強制ブレイク）
        if (remainingPages.length === previousLength) break;
        previousLength = remainingPages.length;
      }

      alert('✅ 対象ルームの要素を現在のフォルダ内に複製・追加しました！');
      window.location.reload(); 
      return true;

    } catch (err) {
      console.error('Clone error:', err);
      alert('❌ 複製の作成中にエラーが発生しました。');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { room, isAuth, verifyPassword, toggleCopyable, updateRoom, cloneWholeRoom, isLoading };
};