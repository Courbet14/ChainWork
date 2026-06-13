import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
// StatisticsModalとuseCriticalPathのパスは後のリファクタリングでfeatures/workspace等に配置される前提のパス
import { StatisticsModal } from '../../workspace/components/StatisticsModal';
import { useCriticalPath } from '../../workspace/hooks/useCriticalPath';
import type { Task } from '../../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
};

export const AdminRoomStatsModal: React.FC<Props> = ({ isOpen, onClose, roomId, roomName }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
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
    } else {
      setTasks([]);
      setPages([]);
    }
  }, [isOpen, roomId]);

  const { criticalPathIds } = useCriticalPath(tasks);

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-4">
          <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm font-bold text-gray-700">最新データを分析中...</span>
        </div>
      </div>
    );
  }

  return (
    <StatisticsModal
      isOpen={true}
      onClose={onClose}
      tasks={tasks}
      pages={pages}
      roomName={roomName}
      selectedPageId={null}
      criticalPathIds={criticalPathIds}
    />
  );
};