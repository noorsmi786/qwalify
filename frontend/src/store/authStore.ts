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

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendConnected: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, companyName: string) => Promise<void>;
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
        if (!isSupabaseConfigured) {
          // If already logged in locally in demo mode, keep session
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch profile and tenant
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
                tenant: tenantData
                  ? {
                      id: tenantData.id,
                      name: tenantData.name,
                      slug: tenantData.slug,
                      logo_url: tenantData.logo_url || undefined,
                      timezone: tenantData.timezone,
                      created_at: tenantData.created_at,
                    }
                  : null,
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
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false });
            throw error;
          }

          if (data.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

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
                tenant: tenantData
                  ? {
                      id: tenantData.id,
                      name: tenantData.name,
                      slug: tenantData.slug,
                      timezone: tenantData.timezone,
                      created_at: tenantData.created_at,
                    }
                  : null,
              });
              return;
            }
          }
        }

        // Mock Fallback
        await new Promise((r) => setTimeout(r, 600));
        set({
          isLoading: false,
          user: { ...DEFAULT_MOCK_USER, email },
          tenant: DEFAULT_MOCK_TENANT,
          isAuthenticated: true,
        });
      },

      signup: async (email: string, password: string, companyName: string) => {
        set({ isLoading: true });

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                company_name: companyName,
                full_name: email.split('@')[0],
              },
            },
          });

          if (error) {
            set({ isLoading: false });
            throw error;
          }

          if (data.user) {
            // Give DB trigger a moment to run
            await new Promise((r) => setTimeout(r, 600));

            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

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
                tenant: tenantData
                  ? {
                      id: tenantData.id,
                      name: tenantData.name,
                      slug: tenantData.slug,
                      timezone: tenantData.timezone,
                      created_at: tenantData.created_at,
                    }
                  : null,
              });
              return;
            }
          }
        }

        // Mock Fallback
        await new Promise((r) => setTimeout(r, 700));
        set({
          isLoading: false,
          user: { ...DEFAULT_MOCK_USER, email },
          tenant: { ...DEFAULT_MOCK_TENANT, name: companyName },
          isAuthenticated: true,
        });
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

        set({
          tenant: {
            ...tenant,
            ...updates,
          },
        });
      },
    }),
    {
      name: 'qwalify-auth-session',
    }
  )
);
