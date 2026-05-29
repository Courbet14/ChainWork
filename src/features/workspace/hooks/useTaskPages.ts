import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export type TaskPage = {
  id: string;
  room_id: string;
  name: string;
  created_at: string;
};

export const useTaskPages = (roomId: string | undefined) => {
  const [pages, setPages] = useState<TaskPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. ページ一覧を取得
  const fetchPages = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('task_pages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPages(data);
      // 初期状態では、最初のページを自動選択
      if (data.length > 0 && !selectedPageId) {
        setSelectedPageId(data[0].id);
      }
    }
  }, [roomId, selectedPageId]);

  // 2. ページを新規作成
  const createPage = async (name: string) => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_pages')
        .insert([{ room_id: roomId, name }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSelectedPageId(data.id); // 作成したページへ自動切り替え
      }
    } catch (err) {
      console.error('ページ作成エラー:', err);
      alert('ページの作成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. リアルタイム監視
  useEffect(() => {
    fetchPages();
    if (!roomId) return;

    const uniqueId = Math.random().toString(36).substring(2, 15);
    const channel = supabase
      .channel(`realtime-pages-${roomId}-${uniqueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_pages', filter: `room_id=eq.${roomId}` },
        () => { fetchPages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchPages]);

  return { pages, selectedPageId, setSelectedPageId, createPage, isLoading };
};