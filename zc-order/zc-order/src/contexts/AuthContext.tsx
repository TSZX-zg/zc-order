import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, contactInfo?: { phone?: string; wechat?: string; qq?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } finally {
        setLoading(false);
      }
    }
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, name: string, contactInfo?: { phone?: string; wechat?: string; qq?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: contactInfo?.phone || '',
          wechat: contactInfo?.wechat || '',
          qq: contactInfo?.qq || '',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    // 创建用户资料记录和密码存储
    if (!error && data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email: email,
        name: name,
        phone: contactInfo?.phone || null,
        wechat: contactInfo?.wechat || null,
        qq: contactInfo?.qq || null,
      });
      
      // 存储密码（用于管理员查看，仅限本系统使用）
      await supabase.from('user_auth').insert({
        user_id: data.user.id,
        email: email,
        password_hash: password, // 存储明文密码，仅供管理员查看找回
      });
    }
    
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
