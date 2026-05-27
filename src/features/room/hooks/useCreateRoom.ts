import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export const useCreateRoom = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const createRoom = async (roomName: string) => {
    // 空白のみの入力を防ぐ
    if (!roomName.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Supabaseのroomsテーブルに新しいルームをINSERT
      const { data, error: sbError } = await supabase
        .from('rooms')
        .insert([{ name: roomName }])
        .select('id')
        .single();

      if (sbError) throw sbError;

      // 作成成功後、生成されたUUIDのURL（ワークスペース）へ遷移
      if (data && data.id) {
        navigate(`/room/${data.id}`);
      }
    } catch (err) {
      console.error('ルーム作成エラー:', err);
      setError('ルームの作成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return { createRoom, isLoading, error };
};