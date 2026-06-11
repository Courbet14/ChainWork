import React from 'react';
import ReactMarkdown from 'react-markdown';
import _Xarrow, { Xwrapper } from 'react-xarrows';
import type { Task, FormField } from '../types';
import type { PositionMap } from '../hooks/useWorkspaceLayout';

const Xarrow = (_Xarrow as any).default || _Xarrow;

type Props = {
  tasks: Task[];
  positions: PositionMap;
  canvasWidth: number;
  canvasHeight: number;
  fields: FormField[];
  onEditTask: (task: Task) => void;
  onAddFromNode: (parentId: string, e: React.MouseEvent) => void;
};

export const WorkspaceCanvas = ({ tasks, positions, canvasWidth, canvasHeight, fields, onEditTask, onAddFromNode }: Props) => {
  return (
    <Xwrapper>
      <div className="relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
        {/* ノードの描画 */}
        {tasks.map((task) => {
          const pos = positions[task.id] || { x: 100, y: 40 };
          const taskStatus = task.metadata?.status || '未着手';
          let styles = { border: 'border-gray-200', bg: 'bg-white', bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' };
          
          if (taskStatus === '着手中') styles = { border: 'border-amber-200', bg: 'bg-amber-50/40', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' };
          if (taskStatus === '終了') styles = { border: 'border-emerald-200', bg: 'bg-emerald-50/30', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };

          return (
            <div 
              key={task.id} 
              id={`task-${task.id}`} 
              onClick={() => onEditTask(task)} 
              className={`absolute w-40 aspect-square ${styles.border} ${styles.bg} border rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group z-10 cursor-pointer`} 
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${styles.bar}`} />
              <div className="p-3 pt-4 flex-shrink-0">
                <div className="text-[10px] text-gray-500 font-mono mb-1 bg-gray-100/80 px-1 py-0.5 rounded text-center truncate">
                  {task.start_date && task.end_date ? `${task.start_date.substring(5)} - ${task.end_date.substring(5)}` : '期間未定'}
                </div>
                <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{task.title}</h4>
              </div>
              
              <div className="px-3 flex-1 overflow-y-hidden relative space-y-1">
                {/* カスタムメタデータ */}
                {task.metadata && Object.entries(task.metadata).map(([k, v]) => {
                  if (k === 'merged_task_ids' || k === 'status' || k === 'memo') return null;
                  if (v === '' || v === null || v === undefined) return null;
                  const f = fields.find(fd => fd.field_key === k);
                  return (
                    <div key={k} className="text-[9px] bg-white/80 px-1.5 py-0.5 rounded border flex justify-between items-center shadow-xs">
                      <span className="text-gray-400 truncate w-12">{f?.label || k}</span>
                      <span className="text-gray-700 font-bold truncate max-w-[50%]">{String(v)}</span>
                    </div>
                  );
                })}
                {/* 簡易メモプレビュー */}
                {task.metadata?.memo && (
                  <div className="relative text-[9px] bg-slate-50 px-1.5 py-1 rounded border border-slate-200 text-slate-500 shadow-xs mt-1 overflow-hidden max-h-12 leading-tight">
                    <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-0.5 last:mb-0" {...props} />, h1: ({node, ...props}) => <strong className="block text-[10px] text-slate-700 mb-0.5" {...props} />, h2: ({node, ...props}) => <strong className="block text-[10px] text-slate-700 mb-0.5" {...props} />, pre: ({node, ref, ...props}: any) => <div className="m-0" {...props} /> }}>
                      {task.metadata.memo}
                    </ReactMarkdown>
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none rounded-b" />
                  </div>
                )}
              </div>

              <div className="p-2 border-t bg-gray-50/50 rounded-b-2xl flex justify-between items-center text-[11px] text-gray-500 flex-shrink-0">
                <span className="truncate max-w-[60%]">{task.assignee || '未設定'}</span>
                <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] scale-95 ${styles.badge}`}>{taskStatus}</span>
              </div>
              
              <button 
                type="button" 
                onClick={(e) => onAddFromNode(task.id, e)} 
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all font-bold shadow-md z-30"
              >
                ＋
              </button>
            </div>
          );
        })}

        {/* 矢印（エッジ）の描画 */}
        {tasks.map((task) => {
          const arrows = [];
          if (task.prev_task_id) {
            arrows.push(<Xarrow key={`main-${task.prev_task_id}-${task.id}`} start={`task-${task.prev_task_id}`} end={`task-${task.id}`} color="#475569" strokeWidth={2} path="grid" gridRadius={4} showHead={true} startAnchor="bottom" endAnchor="top" />);
          }
          if (task.metadata?.merged_task_ids && Array.isArray(task.metadata.merged_task_ids)) {
            task.metadata.merged_task_ids.forEach(mId => { 
              arrows.push(<Xarrow key={`merge-${mId}-${task.id}`} start={`task-${mId}`} end={`task-${task.id}`} color="#475569" strokeWidth={2} path="grid" gridRadius={4} showHead={true} startAnchor="bottom" endAnchor="top" />); 
            });
          }
          return arrows;
        })}
      </div>
    </Xwrapper>
  );
};