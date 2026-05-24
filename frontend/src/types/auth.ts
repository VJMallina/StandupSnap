export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
  // Enterprise org context
  organizationId?: string;
  orgSlug?: string;
  orgRole?: string;
  orgPermissions?: string[];
  isOrgAdmin?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User & {
    // Backend returns these from the auth response
    organizationId?: string;
    orgSlug?: string;
    orgRole?: string;
  };
}

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
  roleName: string;
  invitationToken?: string;
}
