import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { ShareLinkSender } from '../components/ShareLinkSender';
import { CloneReceiver } from '../components/CloneReceiver';

export const ShareClone = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCloneMode = location.pathname.includes('/clone');

  const [roomName, setRoomName] = useState<string>('');
  const [isCopyable, setIsCopyable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const { cloneWholeRoom, isLoading: isCloning } = useRoom(id);

  const cloneUrl = `${window.location.protocol}//${window.location.host}/clone/${id}`;

  // ルーム情報の取得
  useEffect(() => {
    const fetchRoomInfo = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('rooms')
          .select('name, is_copyable')
          .eq('id', id)
          .maybeSingle() as any;

        if (error) throw error;
        
        if (data) {
          setRoomName(data.name);
          setIsCopyable(data.is_copyable ?? true);
        } else {
          setRoomName('不明なルーム');
          setIsCopyable(false);
        }
      } catch (err) {
        console.error('Fetch room info error:', err);
        setIsCopyable(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoomInfo();
  }, [id]);

  // 受信側がクローンを承認した際の処理
  const handleAcceptCloneAction = async () => {
    if (!id) return;
    const myNewRoomId = `workspace-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const { error: roomCreateErr } = await supabase
        .from('rooms')
        .insert({ id: myNewRoomId, name: `${roomName} (Clone)`, is_copyable: true });

      if (roomCreateErr) throw roomCreateErr;

      const success = await cloneWholeRoom(id, myNewRoomId);
      
      if (success) {
        navigate(`/workspace/${myNewRoomId}`);
      }
    } catch (err) {
      console.error('Clone execution error:', err);
      alert('ワークスペースの展開中にエラーが発生しました。');
    }
  };

  // URLクリップボードコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cloneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('URLのコピーに失敗しました。');
    }
  };

  if (isLoading || !id) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isCloneMode) {
    return (
      <CloneReceiver 
        roomId={id} 
        roomName={roomName} 
        isCopyable={isCopyable} 
        isCloning={isCloning} 
        onAccept={handleAcceptCloneAction} 
        onCancel={() => navigate('/')} 
      />
    );
  }

  return (
    <ShareLinkSender 
      roomId={id} 
      roomName={roomName} 
      cloneUrl={cloneUrl} 
      copied={copied} 
      onCopy={handleCopy} 
      onBack={() => navigate(`/workspace/${id}`)} 
    />
  );
};