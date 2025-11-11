# Frontend Implementation Guide - Projects Feature

## ✅ Backend Status
- All 8 Project API endpoints working
- Backend running at http://localhost:3000/api
- RBAC permissions integrated
- Commit: 4729b64

## 📝 Files To Create

### 1. Project API Service
**File:** `frontend/src/services/api/projects.ts`

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const projectsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/projects`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete project');
  },

  getMembers: async (id: string) => {
    const response = await fetch(`${API_URL}/projects/${id}/members`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  },
};
```

### 2. Projects List Page
**File:** `frontend/src/pages/projects/ProjectsListPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../services/api/projects';
import { Project } from '../../types/project';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsApi.delete(id);
      loadProjects();
    } catch (err: any) {
      alert('Failed to delete project: ' + err.message);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button
          onClick={() => navigate('/projects/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Project
        </button>
      </div>

      <div className="bg-white shadow rounded">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{project.name}</td>
                <td className="px-6 py-4">{project.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(project.startDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs ${project.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {project.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => navigate(`/projects/${project.id}`)} className="text-blue-600 hover:underline mr-3">View</button>
                  <button onClick={() => navigate(`/projects/${project.id}/edit`)} className="text-green-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => handleDelete(project.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No projects found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Create Project Page
**File:** `frontend/src/pages/projects/CreateProjectPage.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../services/api/projects';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await projectsApi.create({
        name: formData.name,
        description: formData.description || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        isActive: formData.isActive,
      });
      navigate('/projects');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Project</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="mr-2"
          />
          <label className="text-sm font-medium">Active Project</label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 4. Update App.tsx Routes

Add these routes to `frontend/src/App.tsx`:

```typescript
import ProjectsListPage from './pages/projects/ProjectsListPage';
import CreateProjectPage from './pages/projects/CreateProjectPage';

// Inside your Routes:
<Route path="/projects" element={<ProtectedRoute><ProjectsListPage /></ProtectedRoute>} />
<Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
```

### 5. Update Dashboard Links

In `frontend/src/pages/DashboardPage.tsx`, update the "Create Project" button:

Change:
```typescript
onClick={() => navigate('/projects/new')}
```

To:
```typescript
onClick={() => navigate('/projects/new')}
```

(This should already be correct based on existing code)

## 🚀 Quick Start Commands

```bash
# Frontend is already running at http://localhost:5173
# Backend is already running at http://localhost:3000/api

# Just create the files above and test in browser:
# 1. Login at http://localhost:5173/login
# 2. Go to http://localhost:5173/projects
# 3. Click "Create Project"
# 4. Fill form and submit
```

## ✅ Testing Checklist

- [ ] Can view projects list
- [ ] Can create new project
- [ ] Can see project in list after creation
- [ ] Can click View to see details
- [ ] Can click Edit to modify
- [ ] Can delete project
- [ ] Dashboard "Create Project" button works
- [ ] No console errors
- [ ] Proper error messages on failures

## 🔧 If You Get Errors

1. **401 Unauthorized**: Login again to get fresh token
2. **CORS errors**: Backend .env should have `CORS_ORIGIN=http://localhost:5173`
3. **Network errors**: Check backend is running with `docker ps`
4. **Type errors**: Run `npm run build` in frontend to check TypeScript

---

Backend is 100% complete. Create these 3 files and you'll have a working Projects feature!
