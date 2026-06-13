import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StatisticsModal } from './StatisticsModal';
import { useCriticalPath } from '../hooks/useCriticalPath';
import type { Task } from '../types';

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

  // モーダルが開かれたタイミングで、対象ルームのデータをSupabaseから取得
  useEffect(() => {
    if (isOpen && roomId) {
      const fetchData = async () => {
        setIsLoading(true);
        
        try {
          // 1. タスクの取得
          const { data: tasksData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('room_id', roomId);
          
          if (taskError) throw taskError;

          // 2. ページ（階層）の取得（※テーブル名が task_pages の想定）
          const { data: pagesData, error: pageError } = await supabase
            .from('task_pages')
            .select('*')
            .eq('room_id', roomId);

          if (pageError) throw pageError;

          setTasks(tasksData || []);
          setPages(pagesData || []);
        } catch (err) {
          console.error("統計データの取得に失敗しました:", err);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchData();
    } else {
      // 閉じたときはデータをクリアして軽くする
      setTasks([]);
      setPages([]);
    }
  }, [isOpen, roomId]);

  // クリティカルパスの計算
  const { criticalPathIds } = useCriticalPath(tasks);

  // 閉じてる時は何も描画しない
  if (!isOpen) return null;

  // データ取得中のローディング画面
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-4">
          <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm font-bold text-gray-700">チームの最新データを分析中...</span>
        </div>
      </div>
    );
  }

  // 取得できたら、再利用元の StatisticsModal をそのまま表示！
  return (
    <StatisticsModal
      isOpen={true} // ラッパー側で開閉制御しているのでここはtrue固定
      onClose={onClose}
      tasks={tasks}
      pages={pages}
      roomName={roomName}
      selectedPageId={null} // 💡 Adminは常にルーム全体（null）を俯瞰する
      criticalPathIds={criticalPathIds}
    />
  );
};