import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogOut, Home, HardHat, ShieldCheck } from 'lucide-react';
import NotificationBell from './NotificationBell';

const roleConfig = {
  household: { label: 'Household', icon: Home, path: '/household', color: 'text-teal-600' },
  worker: { label: 'Worker', icon: HardHat, path: '/worker', color: 'text-blue-600' },
  supervisor: { label: 'Supervisor', icon: ShieldCheck, path: '/supervisor', color: 'text-emerald-600' },
};

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const role = roleConfig[profile.role];
  const RoleIcon = role.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-lg leading-none">SafaiSetu</h1>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5">Waste Management Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationBell />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${role.color}`}>
                  <RoleIcon className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 leading-none">{profile.full_name}</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">{role.label}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
