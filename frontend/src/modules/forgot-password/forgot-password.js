// pages/forgot-password.js
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'; // Icons

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' }); // type: 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });

    // Ensure the redirect URL is correct for your update password page
    // and is configured in Supabase Auth settings (Redirect URLs)
    const redirectTo = `${window.location.origin}/update-password`; // Make sure this path is correct

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setMessage({ type: 'error', content: error.message });
    } else {
      setMessage({ type: 'success', content: 'If the email is registered, you will receive a link to reset your password.' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/70 backdrop-blur-md shadow-xl rounded-2xl">
        <div className="flex flex-col items-center">
          <Mail className="w-16 h-16 text-indigo-600 mb-4" />
          <h1 className="text-3xl font-bold text-center text-gray-800">Forgot Password?</h1>
          <p className="text-center text-gray-600 mt-2">
            Enter your email address below. We'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white/80"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {message.content && (
            <div
              className={`p-3 rounded-md flex items-center text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
              {message.content}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 hover:cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link href="/login" className="font-medium text-sm text-indigo-600 hover:text-indigo-500">
            Back to Login
          </Link>
        </div>
      </div>
      <p className="mt-8 text-center text-sm text-gray-600">
        Powered by TOOGAS!
      </p>
    </div>
  );
}
