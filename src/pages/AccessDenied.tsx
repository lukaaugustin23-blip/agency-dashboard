import { signOut } from '../lib/auth'

export default function AccessDenied() {
  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-bg-2 border border-border rounded-2xl p-8 shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-text mb-2">Access Denied</h1>
          <p className="text-text-second text-sm mb-6">
            Your account is not authorized to access this dashboard. Contact your administrator if you believe this is an error.
          </p>

          <button
            onClick={handleSignOut}
            className="w-full bg-bg-3 hover:bg-border border border-border text-text-second hover:text-text font-medium py-3 px-4 rounded-xl transition-all duration-150 text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
