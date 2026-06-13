import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export const useTaskImport = (
  roomId: string | undefined | null, 
  pageId: string | undefined | null, 
  onSuccess?: () => void
) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const handleImportJSON = async () => {
    if (!roomId || !pageId) {
      setImportStatus('❌ エラー: ルームIDまたはページが選択されていません。');
      return;
    }

    try {
      setImportStatus('読み込み中...');
      const tasksToImport = JSON.parse(jsonInput);
      
      if (!Array.isArray(tasksToImport)) {
        throw new Error('JSONは配列形式（[ ... ]）である必要があります。');
      }

      const idMap = new Map<string, string>();
      tasksToImport.forEach(task => {
        if (task.temp_id) idMap.set(task.temp_id, crypto.randomUUID());
      });

      const insertData = tasksToImport.map((task) => {
        const realId = task.temp_id ? idMap.get(task.temp_id) : crypto.randomUUID();
        const realPrevId = task.prev_temp_id ? idMap.get(task.prev_temp_id) : null;

        const combinedMemo = [task.description, task.memo]
          .filter(Boolean)
          .join('\n\n');

        return {
          id: realId,
          room_id: roomId,
          page_id: pageId,
          title: task.title || '無題のタスク',
          start_date: task.start_date || null,
          end_date: task.end_date || null,
          assignee: task.assignee || null,
          prev_task_id: realPrevId || null,
          metadata: {
            status: '未着手',
            memo: combinedMemo
          }
        };
      });

      const { error } = await supabase.from('tasks').insert(insertData);

      if (error) throw error;

      setImportStatus('✅ インポート完了！');
      setJsonInput('');
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus('');
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('Import Error:', err);
      setImportStatus(`❌ エラー: ${err.message || 'JSONの形式が正しくありません。'}`);
    }
  };

  return {
    isImportModalOpen,
    jsonInput,
    setJsonInput,
    importStatus,
    handleImportJSON,
    openModal: () => setIsImportModalOpen(true),
    closeModal: () => {
      setIsImportModalOpen(false);
      setJsonInput('');
      setImportStatus('');
    }
  };
};