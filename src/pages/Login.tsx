import { useState } from 'react'
import { signInWithGoogle } from '../lib/auth'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden flex animate-fade-in">

      {/* ── Left panel ── */}
      <div
        className="w-1/2 relative flex flex-col justify-between overflow-hidden p-16"
        style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 30%, #0ea5e9 70%, #38bdf8 100%)' }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px)',
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px)',
            ].join(','),
          }}
        />

        {/* Large radial gradient — bottom right */}
        <div
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }}
        />

        {/* Small radial gradient — top left */}
        <div
          className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }}
        />

        {/* Glowing orb */}
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-sky-400/20 blur-3xl animate-float pointer-events-none" />

        {/* Wordmark */}
        <div className="relative z-10">
          <span className="text-white text-sm font-bold tracking-[0.3em] uppercase">Agency</span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-white text-5xl font-bold leading-tight">
            Built for<br />closers.
          </h1>
          <p className="text-white/60 text-lg mt-4 max-w-sm">
            Track deals. Crush quotas.<br />Win together.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/30 text-xs">© 2026 Agency. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-1/2 bg-white relative flex items-center justify-center">
        <div className="w-full max-w-sm px-8">

          {/* Logo mark */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="7" y="13" width="14" height="14" rx="2" stroke="#0ea5e9" strokeWidth="1.5" transform="rotate(45 14 20)" />
            <rect x="19" y="13" width="14" height="14" rx="2" stroke="#0ea5e9" strokeWidth="1.5" transform="rotate(45 26 20)" />
          </svg>

          {/* Heading */}
          <h2 className="mt-8 text-3xl font-bold text-[#0f172a] tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-[#64748b]">Sign in to continue to your dashboard</p>

          {/* Error */}
          {error && (
            <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-10 w-full flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-[#1e293b] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-3.5 rounded-xl shadow-lg shadow-slate-900/10 transition-all duration-200 ease-out"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e2e8f0]" />
            <span className="text-[#cbd5e1] text-xs">or</span>
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>

          {/* Terms */}
          <p className="mt-6 text-[#94a3b8] text-xs text-center">
            By signing in, you agree to our Terms of Service
          </p>
        </div>

        {/* Bottom fine print */}
        <p className="absolute bottom-8 left-0 right-0 text-center text-[#cbd5e1] text-xs">
          Access restricted to authorized team members
        </p>
      </div>

    </div>
  )
}
