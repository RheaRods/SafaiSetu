import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Lock } from 'lucide-react';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setDone(true);
      setTimeout(() => navigate('/signin'), 2000);
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
        </div>

        <div className="bg-paper rounded-lg p-8 border border-forest-dark">
          <h2 className="text-xl font-display font-semibold text-ink mb-6">Set a new password</h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-brick/10 border border-brick/20 text-brick text-sm">
              {error}
            </div>
          )}

          {done ? (
            <div className="p-3 rounded-md bg-forest/10 border border-forest/20 text-forest text-sm">
              Password updated. Redirecting to sign in...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">New password</label>
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

              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/30" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
