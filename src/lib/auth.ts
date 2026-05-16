import { supabase } from './supabase'

export type UserRole = 'admin' | 'caller'

const ALLOWED_USERS: Record<string, UserRole> = {
  'luka.augustin23@gmail.com': 'admin',
  'samvittapuriah@gmail.com': 'admin',
  'alexcychu18@gmail.com': 'caller',
  'hudsonmachuca25@gmail.com': 'caller',
  'juliandreyer67@gmail.com': 'caller',
  'meissadude@gmail.com': 'caller',
  'ahe123488@gmail.com': 'caller',
}

export function getUserRole(email: string): UserRole | null {
  return ALLOWED_USERS[email.toLowerCase()] ?? null
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
