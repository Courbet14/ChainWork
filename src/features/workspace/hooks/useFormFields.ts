import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export type FormField = {
  id: number;
  field_key: string;
  field_type: string;
  label: string;
};

export const useFormFields = (roomId: string | undefined) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. 現在設定されているカスタム項目を取得する関数
  const fetchFields = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('form_fields')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setFields(data);
    }
  }, [roomId]);

  // 2. 新しいカスタム項目を追加する関数
  const addField = async (label: string, fieldKey: string, fieldType: string) => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('form_fields').insert([
        {
          room_id: roomId,
          label,
          field_key: fieldKey,
          field_type: fieldType,
        },
      ]);
      if (error) throw error;
    } catch (err) {
      console.error('フィールド追加エラー:', err);
      alert('項目の追加に失敗しました。キー名が重複している可能性があります。');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 【魔法】データベースの変更をリアルタイム監視！
  useEffect(() => {
    fetchFields();

    if (!roomId) return;

    // ミリ秒の重複を避けるため、完全なランダム文字列（乱数）を付与する
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const channel = supabase
      .channel(`realtime-fields-${roomId}-${uniqueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'form_fields',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          console.log('カスタム項目が更新されました！');
          fetchFields();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchFields]);
  return { fields, addField, isLoading };
};