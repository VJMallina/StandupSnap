import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsListPage from './pages/projects/ProjectsListPage';
import CreateProjectPage from './pages/projects/CreateProjectPage';
import ProjectDetailsPage from './pages/projects/ProjectDetailsPage';
import EditProjectPage from './pages/projects/EditProjectPage';
import SprintsListPage from './pages/sprints/SprintsListPage';
import CreateSprintPage from './pages/sprints/CreateSprintPage';
import SprintDetailsPage from './pages/sprints/SprintDetailsPage';
import CardsListPage from './pages/cards/CardsListPage';
import CardDetailsPage from './pages/cards/CardDetailsPage';
import StandupsPage from './pages/StandupsPage';
import TeamPage from './pages/TeamPage';
import TeamManagementPage from './pages/TeamManagementPage';
import ProfilePage from './pages/ProfilePage';
import SnapsPage from './pages/SnapsPage';
import AssigneeListPage from './pages/assignees/AssigneeListPage';
import AssigneeDetailsPage from './pages/assignees/AssigneeDetailsPage';
import ReportsPage from './pages/ReportsPage';
import StandupBookPage from './pages/StandupBookPage';
import StandupBookDayDetailsPage from './pages/StandupBookDayDetailsPage';
import ArtifactsPage from './pages/ArtifactsPage';
import ArtifactsHubPage from './pages/ArtifactsHubPage';
import RisksPage from './pages/RisksPage';
import RAIDLogPage from './pages/RAIDLogPage';
import AssumptionsPage from './pages/AssumptionsPage';
import IssuesPage from './pages/IssuesPage';
import DecisionsPage from './pages/DecisionsPage';
import StakeholderRegisterPage from './pages/StakeholderRegisterPage';
import PowerInterestGridPage from './pages/PowerInterestGridPage';
import StandaloneMomListPage from './pages/StandaloneMomListPage';
import StandaloneMomFormPage from './pages/StandaloneMomFormPage';
import StandaloneMomDetailPage from './pages/StandaloneMomDetailPage';
import ChangesPage from './pages/ChangesPage';
import FormBuilderPage from './pages/FormBuilderPage';
import ScrumRoomsPage from './pages/ScrumRoomsPage';
import ScrumRoomDetailPage from './pages/ScrumRoomDetailPage';
import ResourceTrackerPage from './pages/ResourceTrackerPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ProjectSelectionProvider } from './context/ProjectSelectionContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectSelectionProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                  <CardsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cards/:id"
              element={
                <ProtectedRoute>
                  <CardDetailsPage />
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
              path="/snaps/sprint/:sprintId"
              element={<Navigate to="/snaps" replace />}
            />
            <Route
              path="/assignees"
              element={
                <ProtectedRoute>
                  <AssigneeListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignees/:id"
              element={
                <ProtectedRoute>
                  <AssigneeDetailsPage />
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
            <Route
              path="/standup-book"
              element={
                <ProtectedRoute>
                  <StandupBookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/standup-book/:sprintId/:date"
              element={
                <ProtectedRoute>
                  <StandupBookDayDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mom"
              element={
                <ProtectedRoute>
                  <StandaloneMomListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mom/new"
              element={
                <ProtectedRoute>
                  <StandaloneMomFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mom/:id/edit"
              element={
                <ProtectedRoute>
                  <StandaloneMomFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mom/:id"
              element={
                <ProtectedRoute>
                  <StandaloneMomDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts"
              element={
                <ProtectedRoute>
                  <ArtifactsHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/form-builder"
              element={
                <ProtectedRoute>
                  <FormBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/raci"
              element={
                <ProtectedRoute>
                  <ArtifactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/raci/:matrixId"
              element={
                <ProtectedRoute>
                  <ArtifactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/risks"
              element={
                <ProtectedRoute>
                  <RisksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/raid-log"
              element={
                <ProtectedRoute>
                  <RAIDLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/raid-log/assumptions"
              element={
                <ProtectedRoute>
                  <AssumptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/raid-log/issues"
              element={
                <ProtectedRoute>
                  <IssuesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/raid-log/decisions"
              element={
                <ProtectedRoute>
                  <DecisionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/stakeholders"
              element={
                <ProtectedRoute>
                  <StakeholderRegisterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/stakeholders/grid"
              element={
                <ProtectedRoute>
                  <PowerInterestGridPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/changes"
              element={
                <ProtectedRoute>
                  <ChangesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/artifacts/resources"
              element={
                <ProtectedRoute>
                  <ResourceTrackerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scrum-rooms"
              element={
                <ProtectedRoute>
                  <ScrumRoomsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scrum-rooms/:roomId"
              element={
                <ProtectedRoute>
                  <ScrumRoomDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectSelectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
