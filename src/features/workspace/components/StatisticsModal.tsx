import React from 'react';
import type { Task } from '../../../types';
import { StatisticsView } from './StatisticsView';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  pages: any[];
  roomName?: string;
  selectedPageId?: string | null;
  criticalPathIds?: string[];
};

export const StatisticsModal: React.FC<Props> = ({ isOpen, onClose, tasks, pages, roomName, selectedPageId, criticalPathIds }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="overflow-y-auto rounded-2xl shadow-2xl bg-white border border-gray-200">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="bg-white/80 hover:bg-white text-gray-500 hover:text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-sm font-bold border border-gray-200">✕</button>
          </div>
          <StatisticsView tasks={tasks} pages={pages} roomName={roomName} selectedPageId={selectedPageId} criticalPathIds={criticalPathIds} />
        </div>
      </div>
    </div>
  );
};