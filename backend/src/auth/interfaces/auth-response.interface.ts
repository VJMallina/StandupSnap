import { RoleName, Permission } from '../../entities/role.entity';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    roles: {
      id: string;
      name: RoleName;
      description: string;
      permissions: Permission[];
    }[];
  };
}
