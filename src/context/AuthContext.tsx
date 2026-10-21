import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import { supabase } from '../lib/supabase.ts';
import { auth as firebaseAuth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    minecraftUsername: string
  ) => Promise<{ requiresVerification?: boolean; message?: string }>;
  loginWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { minecraftUsername?: string; username?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  bootstrapOwner: (secret: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('beastmc_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Sync session with backend to get application-level user profile & permissions
  const syncWithBackend = async (supabaseToken: string, extraData?: { username?: string; minecraftUsername?: string }) => {
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseToken}`,
        },
        body: JSON.stringify(extraData || {}),
      });

      if (res.ok) {
        const data = await res.json();
        const activeToken = data.token || supabaseToken;
        localStorage.setItem('beastmc_token', activeToken);
        setToken(activeToken);
        setUser(data.user);
        return data.user;
      } else {
        // Fallback to /api/auth/me if sync fails
        await fetchCurrentUser(supabaseToken);
      }
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
      await fetchCurrentUser(supabaseToken);
    }
  };

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token expired or invalid
        localStorage.removeItem('beastmc_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Supabase Auth session listener
  useEffect(() => {
    let mounted = true;

    // 1. Check current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.access_token) {
        syncWithBackend(session.access_token);
      } else if (token) {
        // If local token exists (e.g. backend JWT), verify it
        fetchCurrentUser(token);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to Supabase Auth state changes (sign in, sign out, token refresh, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('Supabase Auth Event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          await syncWithBackend(session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('beastmc_token');
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Supabase Email & Password Login
  const login = async (email: string, password: string) => {
    // 1. Attempt Supabase Auth Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // Check if email not confirmed
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Your email address has not been confirmed yet. Please check your inbox for the confirmation email.');
      }

      // Fallback: Check if user exists in legacy PostgreSQL system
      const fallbackRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        localStorage.setItem('beastmc_token', fallbackData.token);
        setToken(fallbackData.token);
        setUser(fallbackData.user);
        return;
      }

      throw new Error(error.message || 'Invalid email or password');
    }

    if (data.session?.access_token) {
      await syncWithBackend(data.session.access_token);
    }
  };

  // Supabase Registration
  const register = async (
    email: string,
    password: string,
    username: string,
    minecraftUsername: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanIGN = minecraftUsername.trim();
    const cleanName = username.trim();

    // Register via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanName,
          minecraft_username: cleanIGN,
        },
      },
    });

    if (error) {
      // Fallback to legacy backend registration if Supabase project signup has an issue
      const fallbackRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, username: cleanName, minecraftUsername: cleanIGN }),
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        localStorage.setItem('beastmc_token', fallbackData.token);
        setToken(fallbackData.token);
        setUser(fallbackData.user);
        return { requiresVerification: false, message: 'Account created successfully!' };
      }

      throw new Error(error.message || 'Registration failed');
    }

    // Check if session was returned or if email verification is required
    if (data.session?.access_token) {
      await syncWithBackend(data.session.access_token, {
        username: cleanName,
        minecraftUsername: cleanIGN,
      });
      return { requiresVerification: false, message: 'Account created and signed in successfully!' };
    } else {
      // Email verification required by Supabase
      return {
        requiresVerification: true,
        message: 'Registration successful! A verification link has been sent to your email address. Please click the link to confirm your account.',
      };
    }
  };

  // Google Login (Supabase OAuth with seamless Firebase fallback)
  const loginWithGoogle = async () => {
    try {
      // Attempt Supabase Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.warn('Supabase Google OAuth fallback triggered:', error.message);
        // Fallback to Firebase Google Sign-In if Supabase Google provider is not yet enabled in dashboard
        const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
        const idToken = await result.user.getIdToken();

        const res = await fetch('/api/auth/google-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google login failed');

        localStorage.setItem('beastmc_token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      throw new Error(err.message || 'Google sign-in could not be completed');
    }
  };

  // Password Reset Request
  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/?reset=true`,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
    return {
      success: true,
      message: 'Password reset instructions have been sent to your email address.',
    };
  };

  // Update Password (when user clicks reset link or from settings)
  const resetPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update password');
    }
    return {
      success: true,
      message: 'Your password has been updated successfully.',
    };
  };

  // Resend Email Verification
  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });

    if (error) {
      throw new Error(error.message || 'Failed to resend confirmation email');
    }
    return {
      success: true,
      message: 'Confirmation email resent. Please check your inbox and spam folder.',
    };
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    localStorage.removeItem('beastmc_token');
    setToken(null);
    setUser(null);
  };

  // Update profile
  const updateProfile = async (data: { minecraftUsername?: string; username?: string }) => {
    if (!token) return;
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update profile');
    }

    setUser(result.user);
  };

  // Refresh User Profile
  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  // Server-side Owner Bootstrap
  const bootstrapOwner = async (secret: string) => {
    if (!token) {
      throw new Error('You must be signed in with mhaseebahmed0@gmail.com to provision owner privileges.');
    }

    const res = await fetch('/api/admin/bootstrap-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bootstrapSecret: secret }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Owner bootstrap verification failed');
    }

    if (result.token) {
      localStorage.setItem('beastmc_token', result.token);
      setToken(result.token);
    }
    if (result.user) {
      setUser(result.user);
    }

    return {
      success: true,
      message: result.message || 'Owner role provisioned successfully with full administrative access!',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        forgotPassword,
        resetPassword,
        resendVerification,
        logout,
        updateProfile,
        refreshUser,
        bootstrapOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
