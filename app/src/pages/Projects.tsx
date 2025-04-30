import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

interface Project {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  imageCount: number;
  modelCount: number;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = authService.getToken();
        const response = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // If unauthorized, redirect to login
            authService.logout();
            return;
          }
          throw new Error('Failed to fetch projects');
        }
        
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-screen">
        <p className="text-lg">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-purple-600 text-white px-4 py-2 rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md">
          + New Project
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        <input
          type="text"
          placeholder="Search projects"
          className="px-4 py-2 border rounded-md flex-1"
        />
        <select className="px-4 py-2 border rounded-md">
          <option>Date Edited</option>
          <option>Name</option>
          <option>Created</option>
        </select>
      </div>

      <div className="grid gap-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start">
                <div className="flex-1">
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-gray-500">
                    {project.imageCount} images • {project.modelCount} Models
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No projects found. Create a new project to get started.
          </div>
        )}
      </div>
    </div>
  );
} 