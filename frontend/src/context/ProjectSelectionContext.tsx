import { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectSelectionContextType {
  selectedProjectId: string;
  setSelectedProjectId: (projectId: string) => void;
  clearSelectedProject: () => void;
}

const ProjectSelectionContext = createContext<ProjectSelectionContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedProjectId';

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || '',
  );

  const setSelectedProjectId = (projectId: string) => {
    setSelectedProjectIdState(projectId);
    localStorage.setItem(STORAGE_KEY, projectId);
  };

  const clearSelectedProject = () => {
    setSelectedProjectIdState('');
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ProjectSelectionContext.Provider
      value={{
        selectedProjectId,
        setSelectedProjectId,
        clearSelectedProject,
      }}
    >
      {children}
    </ProjectSelectionContext.Provider>
  );
}

export function useProjectSelection() {
  const context = useContext(ProjectSelectionContext);
  if (context === undefined) {
    throw new Error('useProjectSelection must be used within a ProjectSelectionProvider');
  }
  return context;
}
