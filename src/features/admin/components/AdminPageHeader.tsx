import { Link } from 'react-router-dom';

type Props = {
  title: string;
  hackathonId: string;
  hackathonName?: string;
  showBackButton?: boolean;
};

export const AdminPageHeader = ({ title, hackathonId, hackathonName, showBackButton = true }: Props) => {
  return (
    <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
      {showBackButton && (
        <Link 
          to={`/admin/home/${hackathonId}`} 
          className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl transition-colors"
        >
          ←
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-black text-white tracking-wider">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {hackathonName ? `${hackathonName} (ID: ${hackathonId})` : `ID: ${hackathonId}`}
        </p>
      </div>
    </div>
  );
};