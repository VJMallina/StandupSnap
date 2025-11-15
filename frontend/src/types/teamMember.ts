export enum DesignationRole {
  DEVELOPER = 'Developer',
  QA_TESTER = 'QA / Tester',
  BUSINESS_ANALYST = 'Business Analyst',
  UI_UX_DESIGNER = 'UI/UX Designer',
  DEVOPS_ENGINEER = 'DevOps Engineer',
  AUTOMATION_ENGINEER = 'Automation Engineer',
  BACKEND_DEVELOPER = 'Backend Developer',
  FRONTEND_DEVELOPER = 'Frontend Developer',
  FULL_STACK_DEVELOPER = 'Full Stack Developer',
}

export interface TeamMember {
  id: string;
  fullName: string;
  designationRole: DesignationRole;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamMemberDto {
  fullName: string;
  designationRole: DesignationRole;
  displayName?: string;
}

export interface UpdateTeamMemberDto {
  fullName?: string;
  designationRole?: DesignationRole;
  displayName?: string;
}
