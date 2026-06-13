import { useMemo } from 'react';
import type { Task } from '../../../types';

type Props = {
  selectedPageId: string | null;
  tasks: Task[];
};

export const WorkspaceDashboard = ({ selectedPageId, tasks }: Props) => {
  const stats = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return null;

    const todo = tasks.filter(t => (t.metadata?.status || '未着手') === '未着手').length;
    const doing = tasks.filter(t => t.metadata?.status === '着手中').length;
    const done = tasks.filter(t => t.metadata?.status === '終了').length;
    const rate = Math.round((done / total) * 100);

    const incompleteWithDue = tasks.filter(t => t.end_date && t.metadata?.status !== '終了');
    let earliestTask: Task | null = null;
    let daysLeft: number | null = null;

    if (incompleteWithDue.length > 0) {
      earliestTask = incompleteWithDue.reduce((earliest, current) => new Date(current.end_date!) < new Date(earliest.end_date!) ? current : earliest, incompleteWithDue[0]);
      const today = new Date(); today.setHours(0,0,0,0);
      const dueDate = new Date(earliestTask.end_date!); dueDate.setHours(0,0,0,0);
      daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return { total, todo, doing, done, rate, earliestTask, daysLeft };
  }, [tasks]);

  if (!selectedPageId || !stats) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-4 z-40 flex items-center justify-between text-slate-200 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col w-1/3 pr-6 border-r border-slate-800">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ページ完了率</span>
          <span className="text-lg font-black text-emerald-400 font-mono">{stats.rate}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-6 border-r border-slate-800 flex-1">
        <div className="text-center">
          <div className="text-[10px] font-bold text-slate-400 mb-0.5">未着手</div>
          <div className="bg-slate-800 text-slate-300 font-mono font-bold px-2.5 py-0.5 text-xs rounded-md border border-slate-700">{stats.todo}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold text-amber-400 mb-0.5">着手中</div>
          <div className="bg-amber-950/40 text-amber-400 font-mono font-bold px-2.5 py-0.5 text-xs rounded-md border border-amber-900/60">{stats.doing}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold text-emerald-400 mb-0.5">終了</div>
          <div className="bg-emerald-950/40 text-emerald-400 font-mono font-bold px-2.5 py-0.5 text-xs rounded-md border border-emerald-900/60">{stats.done}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold text-slate-400 mb-0.5">合計</div>
          <div className="bg-slate-700 text-white font-mono font-bold px-2.5 py-0.5 text-xs rounded-md">{stats.total} <span className="text-[9px] text-slate-300">件</span></div>
        </div>
      </div>

      <div className="flex flex-col w-1/3 pl-6 justify-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">直近の締め切り</span>
        {stats.earliestTask ? (
          <div className="flex items-center justify-between gap-2">
            <div className="truncate max-w-[60%]">
              <div className="text-xs font-bold text-white truncate">{stats.earliestTask.title}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{stats.earliestTask.end_date}</div>
            </div>
            {stats.daysLeft !== null && (
              stats.daysLeft < 0 ? (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black text-[10px] px-2 py-1 rounded-lg animate-pulse">期限超過</span>
              ) : stats.daysLeft === 0 ? (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-1 rounded-lg animate-pulse">今日</span>
              ) : (
                <span className="bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[10px] px-2 py-1 rounded-lg">あと {stats.daysLeft} 日</span>
              )
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-medium italic">未完了の期限付きタスクなし</span>
        )}
      </div>
    </div>
  );
};