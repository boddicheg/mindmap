import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import ProjectModal from '../components/ProjectModal';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updatedAt?: string;
  is_private: boolean;
  tags: string[];
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (projectData: {
    name: string;
    description: string;
    is_private: boolean;
    tags: string;
  }) => {
    try {
      setLoading(true);
      const token = authService.getToken();
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      // Close the modal and refresh projects
      setIsModalOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault(); // Prevent navigation to project detail
    e.stopPropagation(); // Prevent event bubbling
    
    try {
      setLoading(true);
      const token = authService.getToken();
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      // Refresh projects list after deletion
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  if (loading && projects.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center h-screen">
        <p className="text-lg">Loading projects...</p>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
        <button 
          onClick={() => fetchProjects()} 
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          + New Project
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        <input
          type="text"
          placeholder="Search projects"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-md flex-1 focus:ring-purple-500 focus:border-purple-500"
        />
        <select 
          className="px-4 py-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created_at">Date Created</option>
          <option value="name">Name</option>
        </select>
      </div>

      {loading && (
        <div className="py-4 text-center text-gray-500">
          Refreshing projects...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedProjects.length > 0 ? (
          sortedProjects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow h-full"
            >
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        project.is_private 
                          ? 'bg-gray-200 text-gray-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {project.is_private ? 'Private' : 'Public'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Delete project"
                      >
                        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{project.description}</p>
                  )}
                  
                  {project.tags && project.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1">
                      {project.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            No projects found. Create a new project to get started.
          </div>
        )}
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
} 