import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TaskPage } from '../types';

export const useTaskPages = (roomId: string | undefined) => {
  const [pages, setPages] = useState<TaskPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('task_pages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPages(data as TaskPage[]);
      if (data.length > 0 && !selectedPageId) {
        setSelectedPageId(data[0].id);
      }
    }
  }, [roomId, selectedPageId]);

  const createPage = async (name: string) => {
    if (!roomId) return;
    try {
      const { data, error } = await supabase
        .from('task_pages')
        .insert([{ room_id: roomId, name }])
        .select()
        .single();
      if (!error && data) {
        setSelectedPageId(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPages();
    if (!roomId) return;
    const channel = supabase
      .channel(`realtime-pages-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_pages', filter: `room_id=eq.${roomId}` }, () => { fetchPages(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchPages]);

  return { pages, selectedPageId, setSelectedPageId, createPage };
};