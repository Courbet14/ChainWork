import React from 'react';

type TaskImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jsonInput: string;
  setJsonInput: (value: string) => void;
  importStatus: string;
  onImport: () => void;
};

export const TaskImportModal: React.FC<TaskImportModalProps> = ({
  isOpen,
  onClose,
  jsonInput,
  setJsonInput,
  importStatus,
  onImport
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
        <h2 className="text-xl font-bold text-gray-800 mb-2">タスクの一括インポート</h2>
        <p className="text-sm text-gray-500 mb-6">
          AIなどで生成したDAG（タスクツリー）のJSON配列を貼り付けてください。
        </p>
        
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='[ { "temp_id": "t1", "title": "フロントエンド構築", "description": "Reactのセットアップ", "depends_on": [] } ]'
          className="w-full h-64 bg-gray-50 border border-gray-300 text-gray-800 font-mono text-sm rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 mb-4 transition-all"
        />
        
        {importStatus && (
          <div className={`text-sm font-bold mb-4 ${importStatus.includes('❌') ? 'text-red-500' : 'text-green-600'}`}>
            {importStatus}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors"
          >
            キャンセル
          </button>
          <button 
            onClick={onImport}
            disabled={!jsonInput.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            インポートを実行
          </button>
        </div>
      </div>
    </div>
  );
};