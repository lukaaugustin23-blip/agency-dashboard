'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, Moon, Sun, Search, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface NavbarProps {
  onMobileMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

export default function Navbar({ onMobileMenuToggle, sidebarCollapsed }: NavbarProps) {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<{ email?: string; avatar?: string; name?: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          avatar: data.user.user_metadata?.avatar_url,
          name: data.user.user_metadata?.full_name,
        });
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
  };

  const leftOffset = `${sidebarCollapsed ? 72 : 260}px`;

  return (
    <header
      className="fixed top-0 right-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 flex items-center px-4 gap-3 transition-all duration-200"
      style={{ left: 'var(--sidebar-left, 0)' }}
    >
      <style>{`:root { --sidebar-left: ${leftOffset}; } @media (max-width: 1023px) { :root { --sidebar-left: 0px; } }`}</style>

      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <Menu size={20} className="text-slate-600 dark:text-slate-400" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xs hidden sm:flex">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle dark mode"
        >
          {dark
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} className="text-slate-500" />
          }
        </button>

        {/* User avatar */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {user?.avatar
              ? <Image src={user.avatar} alt="avatar" width={32} height={32} className="rounded-full ring-2 ring-primary/20" />
              : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.[0] ?? 'U'}
                </div>
            }
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block max-w-[120px] truncate">
              {user?.name?.split(' ')[0] ?? user?.email?.split('@')[0]}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
