import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsListPage from './pages/projects/ProjectsListPage';
import CreateProjectPage from './pages/projects/CreateProjectPage';
import ProjectDetailsPage from './pages/projects/ProjectDetailsPage';
import EditProjectPage from './pages/projects/EditProjectPage';
import SprintsListPage from './pages/sprints/SprintsListPage';
import CreateSprintPage from './pages/sprints/CreateSprintPage';
import SprintDetailsPage from './pages/sprints/SprintDetailsPage';
import StandupsPage from './pages/StandupsPage';
import TeamPage from './pages/TeamPage';
import TeamManagementPage from './pages/TeamManagementPage';
import ProfilePage from './pages/ProfilePage';
import CardsPage from './pages/CardsPage';
import SnapsPage from './pages/SnapsPage';
import ReportsPage from './pages/ReportsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/new"
            element={
              <ProtectedRoute>
                <CreateProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/edit"
            element={
              <ProtectedRoute>
                <EditProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/team"
            element={
              <ProtectedRoute>
                <TeamManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sprints"
            element={
              <ProtectedRoute>
                <SprintsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sprints/new"
            element={
              <ProtectedRoute>
                <CreateSprintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sprints/:id"
            element={
              <ProtectedRoute>
                <SprintDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/standups"
            element={
              <ProtectedRoute>
                <StandupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <TeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <CardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/snaps"
            element={
              <ProtectedRoute>
                <SnapsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
