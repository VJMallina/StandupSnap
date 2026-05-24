import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Decode JWT payload to extract org context
 */
function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  // Enterprise permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isOrgAdmin: boolean;
  orgRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            // Decode JWT to get org permissions
            let activeToken = localStorage.getItem('accessToken');
            let orgData = activeToken ? decodeJwtPayload(activeToken) : null;

            // If the stored token has no org context OR no permissionsVersion (old token
            // issued before versioning was added), refresh so stale-token checks don't fire.
            if (!orgData?.organizationId || !orgData?.permissionsVersion) {
              const storedRefreshToken = localStorage.getItem('refreshToken');
              if (storedRefreshToken) {
                try {
                  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: storedRefreshToken }),
                  });
                  if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    localStorage.setItem('accessToken', refreshData.accessToken);
                    localStorage.setItem('refreshToken', refreshData.refreshToken);
                    activeToken = refreshData.accessToken;
                    orgData = decodeJwtPayload(refreshData.accessToken);
                  }
                } catch {
                  // Silently continue with existing token
                }
              }
            }

            setUser({
              id: userData.id,
              username: userData.username,
              email: userData.email,
              name: userData.name,
              roles: userData.roles?.map((r: any) => r.name) || [],
              // Org context from JWT
              organizationId: orgData?.organizationId,
              orgSlug: orgData?.orgSlug,
              orgRole: orgData?.orgRole,
              orgPermissions: orgData?.orgPermissions || [],
              isOrgAdmin: orgData?.orgRole === 'ORG_ADMIN',
            });
          } else {
            // Token rejected — try to refresh before giving up (handles TOKEN_STALE)
            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (storedRefreshToken) {
              try {
                const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken: storedRefreshToken }),
                });
                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  localStorage.setItem('accessToken', refreshData.accessToken);
                  localStorage.setItem('refreshToken', refreshData.refreshToken);
                  const orgData = decodeJwtPayload(refreshData.accessToken);
                  setUser({
                    id: refreshData.user.id,
                    username: refreshData.user.username,
                    email: refreshData.user.email,
                    name: refreshData.user.name,
                    roles: refreshData.user.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
                    organizationId: orgData?.organizationId,
                    orgSlug: orgData?.orgSlug,
                    orgRole: orgData?.orgRole,
                    orgPermissions: orgData?.orgPermissions || [],
                    isOrgAdmin: orgData?.orgRole === 'ORG_ADMIN',
                  });
                  return;
                }
              } catch {
                // Fall through to clear state
              }
            }
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('selectedProjectId');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('selectedProjectId');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Decode JWT to get org permissions
    const orgData = decodeJwtPayload(data.accessToken);

    // Map roles to strings (role names) like in initAuth
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      name: data.user.name,
      roles: data.user.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
      // Org context from JWT
      organizationId: orgData?.organizationId,
      orgSlug: orgData?.orgSlug,
      orgRole: orgData?.orgRole,
      orgPermissions: orgData?.orgPermissions || [],
      isOrgAdmin: orgData?.orgRole === 'ORG_ADMIN',
    });
  };

  const register = async (registerData: RegisterData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // Decode JWT to get org permissions
      const orgData = decodeJwtPayload(data.accessToken);

      // Map roles to strings (role names) like in initAuth
      setUser({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        name: data.user.name,
        roles: data.user.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
        // Org context from JWT
        organizationId: orgData?.organizationId,
        orgSlug: orgData?.orgSlug,
        orgRole: orgData?.orgRole,
        orgPermissions: orgData?.orgPermissions || [],
        isOrgAdmin: orgData?.orgRole === 'ORG_ADMIN',
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Registration timed out. Please try again.');
      }
      throw error;
    }
  };

  const refreshSession = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) return;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!response.ok) {
        // Refresh token invalid/expired — force clean logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('selectedProjectId');
        setUser(null);
        return;
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      const orgData = decodeJwtPayload(data.accessToken);
      // Always set full user state so this works even when called right after registration
      // (when user state may still be null)
      setUser({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        name: data.user.name,
        roles: data.user.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
        organizationId: orgData?.organizationId,
        orgSlug: orgData?.orgSlug,
        orgRole: orgData?.orgRole,
        orgPermissions: orgData?.orgPermissions || [],
        isOrgAdmin: orgData?.orgRole === 'ORG_ADMIN',
      });
    } catch {
      // Silently fail — session remains as-is
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('selectedProjectId');
    setUser(null);
  };

  // Permission helper functions
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.isOrgAdmin) return true; // ORG_ADMIN has all permissions
    return user.orgPermissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.isOrgAdmin) return true;
    return permissions.some((p) => user.orgPermissions?.includes(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.isOrgAdmin) return true;
    return permissions.every((p) => user.orgPermissions?.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshSession,
        isAuthenticated: !!user,
        // Permission helpers
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isOrgAdmin: user?.isOrgAdmin || false,
        orgRole: user?.orgRole || null,
      }}
    >
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
