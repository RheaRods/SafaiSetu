import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Mail, Lock, User, Phone, ArrowRight, Home, HardHat, ShieldCheck } from 'lucide-react';
import type { UserRole } from '@/types';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('household');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password, fullName, phone, role);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  };

  const roles: { value: UserRole; label: string; desc: string; icon: typeof Home }[] = [
    { value: 'household', label: 'Household', desc: 'Track collections, report issues', icon: Home },
    { value: 'worker', label: 'Worker', desc: 'Manage routes & collect waste', icon: HardHat },
    { value: 'supervisor', label: 'Supervisor', desc: 'Oversee operations & assignments', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-moss text-forest-dark mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-display font-semibold text-paper">SafaiSetu</h1>
          <p className="text-paper/60 mt-2">Join the waste management network</p>
        </div>

        <div className="bg-paper rounded-lg p-8 border border-forest-dark">
          <h2 className="text-xl font-display font-semibold text-ink mb-6">Create your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-brick/10 border border-brick/20 text-brick text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-md border-2 transition ${
                        role === r.value
                          ? 'border-forest bg-moss/10 text-forest-dark'
                          : 'border-sand-dark text-ink/50 hover:border-forest/40'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{r.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink/40 mt-1.5">{roles.find((r) => r.value === role)?.desc}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-sand-dark bg-white focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-sand-dark bg-white focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-sand-dark bg-white focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-sand-dark bg-white focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-dark text-paper font-medium py-2.5 rounded-md transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-ink/50 mt-6">
            Already have an account?{' '}
            <Link to="/signin" className="text-forest font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
