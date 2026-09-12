import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSent(true);
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
          <h2 className="text-xl font-display font-semibold text-ink mb-2">Reset your password</h2>
          <p className="text-sm text-ink/50 mb-6">
            Enter the email on your account and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-brick/10 border border-brick/20 text-brick text-sm">
              {error}
            </div>
          )}

          {sent ? (
            <div className="p-3 rounded-md bg-forest/10 border border-forest/20 text-forest text-sm">
              If an account exists for that email, a reset link is on its way. Check your inbox.
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-forest hover:bg-forest-dark text-paper font-medium py-2.5 rounded-md transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-ink/50 mt-6">
            <Link to="/signin" className="text-forest font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
