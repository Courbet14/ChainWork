import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StatisticsView } from '../../workspace/components/StatisticsView';
import { useCriticalPath } from '../../workspace/hooks/useCriticalPath';
import type { Task } from '../../../types';

type Props = {
  roomId: string;
  roomName: string;
};

export const AdminRoomStatsCard: React.FC<Props> = ({ roomId, roomName }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: tasksData, error: taskError } = await supabase.from('tasks').select('*').eq('room_id', roomId);
        if (taskError) throw taskError;

        const { data: pagesData, error: pageError } = await supabase.from('task_pages').select('*').eq('room_id', roomId);
        if (pageError) throw pageError;

        setTasks(tasksData || []);
        setPages(pagesData || []);
      } catch (err) {
        console.error('統計データの取得に失敗:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [roomId]);

  const { criticalPathIds } = useCriticalPath(tasks);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex items-center justify-center h-48 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm font-bold text-slate-400">{roomName} のデータを同期中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-xl overflow-hidden border border-slate-800 bg-white">
      <StatisticsView tasks={tasks} pages={pages} roomName={roomName} criticalPathIds={criticalPathIds} />
    </div>
  );
};