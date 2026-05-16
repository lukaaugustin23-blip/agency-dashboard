import { signOut } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-bg-2 px-6 py-4 flex items-center justify-between">
        <span className="font-bold tracking-widest text-sm text-accent">AGENCY</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-second px-2 py-1 bg-bg-3 border border-border rounded-md">Caller</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex items-center justify-center h-[calc(100vh-61px)]">
        <p className="text-text-second text-sm">Caller dashboard — coming soon</p>
      </main>
    </div>
  )
}
