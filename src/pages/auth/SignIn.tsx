import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Mail, Lock, ArrowRight } from 'lucide-react';

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-moss text-forest-dark mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-display font-semibold text-paper">SafaiSetu</h1>
          <p className="text-paper/60 mt-2">Connecting citizens, workers &amp; supervisors for cleaner neighborhoods</p>
        </div>

        <div className="bg-paper rounded-lg p-8 border border-forest-dark">
          <h2 className="text-xl font-display font-semibold text-ink mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-brick/10 border border-brick/20 text-brick text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink/70">Password</label>
                <Link to="/forgot-password" className="text-xs text-forest font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                <input
                  type="password"
                  required
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
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-ink/50 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-forest font-medium hover:underline">Sign up</Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-forest-dark rounded-lg border border-moss/20">
          <p className="text-xs font-semibold text-moss-light mb-2">Demo accounts (password: demo1234):</p>
          <div className="space-y-1 text-xs text-paper/70">
            <p>Household: household1@safaisetu.demo</p>
            <p>Worker: worker1@safaisetu.demo</p>
            <p>Supervisor: supervisor@safaisetu.demo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
