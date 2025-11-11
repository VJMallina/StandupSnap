export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  members?: ProjectMember[];
  sprints?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  role: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface AddMemberData {
  userId: string;
  role: string;
  startDate?: string;
  endDate?: string;
}
