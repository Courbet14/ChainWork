import { CreateRoomForm } from '../features/room/components/CreateRoomForm';

export const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold text-blue-600 tracking-tight mb-3">
          ChainWork
        </h1>
        <p className="text-gray-500 text-lg">
          爆速で同期する超拡張型タスク管理
        </p>
      </div>
      
      <CreateRoomForm />
    </div>
  );
};