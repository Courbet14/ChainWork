import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { FormField } from '../../../types';

export const useFormFields = (roomId: string | undefined) => {
  const [fields, setFields] = useState<FormField[]>([]);

  const fetchFields = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from('form_fields')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      setFields(data as FormField[]);
    }
  }, [roomId]);

  const addField = async (key: string, label: string, type: string) => {
    if (!roomId) return;

    try {
      const { error } = await supabase
        .from('form_fields')
        .insert([{ 
          room_id: roomId, 
          field_key: key, 
          label, 
          field_type: type 
        }]);

      if (error) throw error;
      fetchFields();
    } catch (err) {
      console.error('Add field error:', err);
      alert('フィールドの追加に失敗しました。キーが重複している可能性があります。');
    }
  };

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  return { fields, addField };
};