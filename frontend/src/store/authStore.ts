import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const DEFAULT_MOCK_TENANT: Tenant = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Acme Corp',
  slug: 'acme-corp',
  timezone: 'America/New_York',
  created_at: '2026-01-01T00:00:00Z',
};

const DEFAULT_MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: 'a0000000-0000-0000-0000-000000000001',
  email: 'admin@acmecorp.com',
  full_name: 'Jordan Kim',
  role: 'owner',
};

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password. Please try again.';
  if (message.includes('Email not confirmed')) return 'Please sign in again — your account is being set up.';
  if (message.includes('User already registered')) return 'An account with this email already exists. Please sign in instead.';
  if (message.includes('Password should be at least')) return 'Password must be at least 8 characters long.';
  if (message.includes('Unable to validate email address')) return 'Please enter a valid email address.';
  return message;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendConnected: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, companyName: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTenantInfo: (updates: Partial<Tenant>) => Promise<void>;
}



export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      isBackendConnected: isSupabaseConfigured,

      initAuth: async () => {
        if (!isSupabaseConfigured) return;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            if (profile) {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profile.tenant_id)
                .maybeSingle();
              set({
                isAuthenticated: true,
                user: {
                  id: profile.id,
                  tenant_id: profile.tenant_id,
                  email: profile.email,
                  full_name: profile.full_name,
                  role: profile.role,
                  avatar_url: profile.avatar_url || undefined,
                },
                tenant: tenantData ? {
                  id: tenantData.id,
                  name: tenantData.name,
                  slug: tenantData.slug,
                  logo_url: tenantData.logo_url || undefined,
                  timezone: tenantData.timezone,
                  created_at: tenantData.created_at,
                } : null,
              });
            }
          }
        } catch (err) {
          console.error('Failed to init Supabase session:', err);
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });

          if (error) {
            set({ isLoading: false });
            throw new Error(mapAuthError(error.message));
          }

          if (data.user) {
            let profile = null;
            for (let i = 0; i < 5; i++) {
              const { data: p } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();
              if (p) { profile = p; break; }
              await new Promise((r) => setTimeout(r, 500));
            }

            if (profile) {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profile.tenant_id)
                .maybeSingle();
              set({
                isLoading: false,
                isAuthenticated: true,
                user: {
                  id: profile.id,
                  tenant_id: profile.tenant_id,
                  email: profile.email,
                  full_name: profile.full_name,
                  role: profile.role,
                },
                tenant: tenantData ? {
                  id: tenantData.id,
                  name: tenantData.name,
                  slug: tenantData.slug,
                  timezone: tenantData.timezone,
                  created_at: tenantData.created_at,
                } : null,
              });
              return;
            }
          }

          set({ isLoading: false });
          throw new Error('Could not load your profile. Please try signing in again.');
        }

        // Mock fallback — only when Supabase is NOT configured
        await new Promise((r) => setTimeout(r, 600));
        set({
          isLoading: false,
          user: { ...DEFAULT_MOCK_USER, email },
          tenant: DEFAULT_MOCK_TENANT,
          isAuthenticated: true,
        });
      },

      signup: async (email: string, password: string, companyName: string, fullName?: string) => {
        set({ isLoading: true });

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                company_name: companyName,
                full_name: fullName || email.split('@')[0],
              },
            },
          });

          if (error) {
            set({ isLoading: false });
            throw new Error(mapAuthError(error.message));
          }

          if (data.user) {
            // If email confirmation is disabled, we get a session immediately
            // If confirmation is enabled, session will be null — try signing in
            if (!data.session) {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
              if (signInData?.session) {
                // Successfully signed in after signup
              } else if (signInError) {
                // Email confirmation might be required
                set({ isLoading: false });
                throw new Error('Account created! You can now sign in with your email and password.');
              }
            }

            // Fetch profile with retries (DB trigger may take a moment)
            let profile = null;
            for (let i = 0; i < 6; i++) {
              const { data: p } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();
              if (p) { profile = p; break; }
              await new Promise((r) => setTimeout(r, 600));
            }

            if (profile) {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profile.tenant_id)
                .maybeSingle();
              set({
                isLoading: false,
                isAuthenticated: true,
                user: {
                  id: profile.id,
                  tenant_id: profile.tenant_id,
                  email: profile.email,
                  full_name: profile.full_name,
                  role: profile.role,
                },
                tenant: tenantData ? {
                  id: tenantData.id,
                  name: tenantData.name,
                  slug: tenantData.slug,
                  timezone: tenantData.timezone,
                  created_at: tenantData.created_at,
                } : null,
              });
              return;
            }

            // Profile not ready yet (edge case) — ask user to sign in
            set({ isLoading: false });
            throw new Error('Account created! Please sign in with your email and password.');
          }
        }

        // Mock fallback
        if (!isSupabaseConfigured) {
          await new Promise((r) => setTimeout(r, 700));
          set({
            isLoading: false,
            user: { ...DEFAULT_MOCK_USER, email, full_name: fullName || email.split('@')[0] },
            tenant: { ...DEFAULT_MOCK_TENANT, name: companyName },
            isAuthenticated: true,
          });
        } else {
          set({ isLoading: false });
          throw new Error('Unable to create account. Please try again.');
        }
      },

      logout: async () => {
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
        set({ user: null, tenant: null, isAuthenticated: false });
      },

      updateTenantInfo: async (updates: Partial<Tenant>) => {
        const { tenant } = get();
        if (!tenant) return;
        if (isSupabaseConfigured) {
          await supabase
            .from('tenants')
            .update({
              name: updates.name ?? tenant.name,
              timezone: updates.timezone ?? tenant.timezone,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenant.id);
        }
        set({ tenant: { ...tenant, ...updates } });
      },
    }),
    { name: 'qwalify-auth-session' }
  )
);
