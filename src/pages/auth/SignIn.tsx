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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200 mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SafaiSetu</h1>
          <p className="text-gray-500 mt-2">Connecting citizens, workers & supervisors for cleaner neighborhoods</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 p-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition shadow-md shadow-teal-200 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-teal-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-100">
          <p className="text-xs font-semibold text-teal-800 mb-2">Demo accounts (password: demo1234):</p>
          <div className="space-y-1 text-xs text-teal-700">
            <p>Household: household1@safaisetu.demo</p>
            <p>Worker: worker1@safaisetu.demo</p>
            <p>Supervisor: supervisor@safaisetu.demo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
