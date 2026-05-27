import type { Task } from '../hooks/useTasks';
import type { FormField } from '../hooks/useFormFields';

type Props = {
  task: Task;
  allTasks: Task[];
  fields: FormField[];
  onAddChild: (parentId: string) => void;
};

export const TaskTreeNode = ({ task, allTasks, fields, onAddChild }: Props) => {
  const children = allTasks.filter((t) => t.prev_task_id === task.id);

  return (
    <div className="flex flex-col items-center">
      
      {/* 🟦 1:1 タイル型タスクカード */}
      <div 
        id={`task-${task.id}`} 
        className="w-40 aspect-square bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all relative flex flex-col justify-between group z-10 mx-4"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-blue-500" />
        
        <div className="p-3 pt-4">
          <div className="text-[10px] text-gray-400 font-mono mb-1 leading-none">
            {task.start_date ? task.start_date.replace(/^\d{4}-/, '') : '未定'}
          </div>
          <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug">{task.title}</h4>
        </div>

        <div className="px-3 flex-1 overflow-y-auto space-y-1">
          {Object.entries(task.metadata).map(([key, value]) => {
            if (key === 'merged_task_ids') return null;
            const fieldDef = fields.find((f) => f.field_key === key);
            return (
              <div key={key} className="text-[9px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex justify-between items-center">
                <span className="text-gray-400 truncate w-10">{fieldDef?.label || key}</span>
                <span className="text-gray-700 font-bold truncate max-w-[50%]">{String(value)}</span>
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center text-xs">
          <span className="text-gray-500 truncate pr-2">👤 {task.assignee || '未設定'}</span>
        </div>

        <button
          onClick={() => onAddChild(task.id)}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 text-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all z-20 font-bold text-sm"
          title="ここからタスクを分岐させる"
        >
          ＋
        </button>
      </div>

      {/* 🌿 子タスクがある場合、単に下側のコンテナに並べる（CSSの線は全カット！） */}
      {children.length > 0 && (
        <div className="flex justify-center relative pt-12">
          {children.map((child) => (
            <div key={child.id} className="relative flex flex-col items-center">
              <TaskTreeNode task={child} allTasks={allTasks} fields={fields} onAddChild={onAddChild} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};