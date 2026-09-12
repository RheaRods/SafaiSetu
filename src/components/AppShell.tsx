import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogOut, Home, HardHat, ShieldCheck } from 'lucide-react';
import NotificationBell from './NotificationBell';

const roleConfig = {
  household: { label: 'Household', icon: Home },
  worker: { label: 'Worker', icon: HardHat },
  supervisor: { label: 'Supervisor', icon: ShieldCheck },
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
    <div className="min-h-screen bg-paper">
      <header className="glass-dark sticky top-0 z-30 border-b border-moss/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-moss text-forest-dark flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display font-semibold text-paper text-lg leading-none">SafaiSetu</h1>
                <p className="text-[10px] text-paper/60 leading-none mt-1">Waste Management Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationBell />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-full bg-moss/20 flex items-center justify-center text-moss-light">
                  <RoleIcon className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-paper leading-none">{profile.full_name}</p>
                  <p className="text-[10px] text-paper/50 leading-none mt-1">{role.label}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-md text-paper/60 hover:text-brick-light hover:bg-white/10 transition"
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
