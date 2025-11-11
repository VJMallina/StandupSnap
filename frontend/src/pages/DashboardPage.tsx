import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Permission, RoleName } from '../constants/roles';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../services/api/projects';
import { Project } from '../types/project';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (hasPermission(Permission.VIEW_PROJECT)) {
        const projectsData = await projectsApi.getAll();
        setProjects(projectsData.slice(0, 5)); // Show only first 5
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-lg text-gray-600">
            Here's what's happening with your projects
          </p>
        </div>

        {/* Quick Actions */}
        {hasPermission(Permission.CREATE_PROJECT) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hasPermission(Permission.CREATE_PROJECT) && (
                <button
                  onClick={() => navigate('/projects/new')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Create Project</p>
                      <p className="text-sm text-gray-500">Start a new project</p>
                    </div>
                  </div>
                </button>
              )}

              {hasPermission(Permission.CREATE_SPRINT) && (
                <button
                  onClick={() => navigate('/sprints/new')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Create Sprint</p>
                      <p className="text-sm text-gray-500">Start a new sprint</p>
                    </div>
                  </div>
                </button>
              )}

              {hasPermission(Permission.SEND_INVITE) && (
                <button
                  onClick={() => navigate('/team/invite')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Invite Team</p>
                      <p className="text-sm text-gray-500">Add new members</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* PMO View Message */}
        {hasRole(RoleName.PMO) && !hasPermission(Permission.CREATE_PROJECT) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  You have <strong>view-only access</strong> to projects and team updates.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects Section */}
          {hasPermission(Permission.VIEW_PROJECT) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
                <button
                  onClick={() => navigate('/projects')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${project.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {project.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Started: {new Date(project.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <p className="font-medium">No projects yet</p>
                  <p className="text-sm mt-1">Create your first project to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Sprints Section */}
          {hasPermission(Permission.VIEW_SPRINT) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Active Sprints</h2>
                <button
                  onClick={() => navigate('/sprints')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </button>
              </div>

              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="font-medium">No active sprints</p>
                <p className="text-sm mt-1">Create a sprint to start tracking work</p>
              </div>
            </div>
          )}

          {/* Team Section */}
          {hasPermission(Permission.VIEW_TEAM_MEMBER) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Team</h2>
                <button
                  onClick={() => navigate('/team')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </button>
              </div>

              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="font-medium">No team members</p>
                <p className="text-sm mt-1">Invite team members to collaborate</p>
              </div>
            </div>
          )}

          {/* Recent Standups Section */}
          {hasPermission(Permission.VIEW_STANDUP) && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Standups</h2>
                <button
                  onClick={() => navigate('/standups')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </button>
              </div>

              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium">No standup updates</p>
                <p className="text-sm mt-1">Start creating daily standups</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
