import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { generateDeviceFingerprint, type DeviceFingerprint } from '../utils/deviceFingerprint';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  deviceFingerprint: DeviceFingerprint | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, userData: any) => Promise<{ success: boolean; error?: string }>;
  validateSessionSecurity: () => Promise<{ valid: boolean; riskLevel?: string; reason?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  deviceFingerprint: null,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  
  signOut: async () => {
    try {
      const { user } = get();
      if (user) {
        // Log session termination
        await fetch('/api/security/session-end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${get().session?.access_token}`
          },
          body: JSON.stringify({
            userId: user.id,
            reason: 'user_logout'
          })
        });
      }
      
      await supabase.auth.signOut();
      set({ user: null, session: null, deviceFingerprint: null });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },
  
  initialize: async () => {
    try {
      let { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message);
      }
      
      // Generate device fingerprint for session security
      let deviceFingerprint = null;
      if (session?.user) {
        try {
          deviceFingerprint = await generateDeviceFingerprint();
          
          // Validate session security
          const securityResponse = await fetch('/api/auth/validate-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              deviceFingerprint,
              userAgent: navigator.userAgent
            })
          });
          
          if (!securityResponse.ok) {
            const securityData = await securityResponse.json();
            if (securityData.riskLevel === 'critical') {
              // Critical security issue - force logout
              await supabase.auth.signOut();
              session = null;
              deviceFingerprint = null;
            }
          }
        } catch (securityError) {
          console.error('Session security validation error:', securityError);
        }
      }
      
      set({ 
        session, 
        user: session?.user || null,
        deviceFingerprint,
        loading: false,
        initialized: true
      });
      
      // Set up auth state listener
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          try {
            const fingerprint = await generateDeviceFingerprint();
            set({ 
              session: newSession, 
              user: newSession.user,
              deviceFingerprint: fingerprint
            });
          } catch (error) {
            console.error('Device fingerprint generation error:', error);
            set({ 
              session: newSession, 
              user: newSession.user
            });
          }
        } else {
          set({ 
            session: newSession, 
            user: newSession?.user || null,
            deviceFingerprint: null
          });
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ loading: false, initialized: true });
    }
  },
  
  login: async (email: string, password: string) => {
    try {
      // Generate device fingerprint before login
      const deviceFingerprint = await generateDeviceFingerprint();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user && data.session) {
        // Validate session security on login
        const securityResponse = await fetch('/api/auth/login-security', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`
          },
          body: JSON.stringify({
            deviceFingerprint,
            userAgent: navigator.userAgent,
            loginTime: new Date().toISOString()
          })
        });
        
        if (!securityResponse.ok) {
          const securityData = await securityResponse.json();
          if (securityData.riskLevel === 'critical') {
            // Critical security issue - force logout
            await supabase.auth.signOut();
            return { success: false, error: 'Security validation failed. Login blocked.' };
          }
        }
        
        set({
          user: data.user,
          session: data.session,
          deviceFingerprint
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  },
  
  register: async (email: string, password: string, userData: any) => {
    try {
      // Generate device fingerprint for new user
      const deviceFingerprint = await generateDeviceFingerprint();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
            deviceFingerprint: JSON.stringify(deviceFingerprint),
            registrationTime: new Date().toISOString()
          }
        }
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user && data.session) {
        set({
          user: data.user,
          session: data.session,
          deviceFingerprint
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  },
  
  validateSessionSecurity: async () => {
    try {
      const { session, deviceFingerprint } = get();
      
      if (!session?.access_token) {
        return { valid: false, reason: 'No active session' };
      }
      
      const response = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          deviceFingerprint,
          userAgent: navigator.userAgent
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        return { valid: false, riskLevel: data.riskLevel, reason: data.reason };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Session security validation error:', error);
      return { valid: false, reason: 'Validation failed' };
    }
  }
}));