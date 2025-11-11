import { RoleName, Permission } from '../../entities/role.entity';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: {
      id: string;
      name: RoleName;
      description: string;
      permissions: Permission[];
    }[];
  };
}
