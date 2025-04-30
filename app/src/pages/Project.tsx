import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Panel,
  addEdge,
  BackgroundVariant,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import authService from '../services/authService';

// Initial nodes and edges for the flow
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'Default Node' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Output Node' },
    position: { x: 250, y: 250 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

interface ProjectData {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  created_at: string;
  tags: string[];
}

interface FlowData {
  id: number;
  project_id: number;
  flow: string;
  last_updated: string;
}

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  
  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Function to fetch project flow data
  const fetchProjectFlow = useCallback(async (projectId: string) => {
    if (!projectId) return;

    try {
      const token = authService.getToken();
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(`/api/projects/${projectId}/flow`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project flow data');
      }
      
      const data = await response.json();
      
      // If flow data exists, parse and set it
      if (data && data.flow) {
        try {
          const flowData = JSON.parse(data.flow);
          if (flowData.nodes && flowData.edges) {
            setNodes(flowData.nodes);
            setEdges(flowData.edges);
          }
        } catch (err) {
          console.error('Error parsing flow data:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching project flow:', error);
    }
  }, [navigate, setNodes, setEdges]);
  
  useEffect(() => {
    if (!projectId) return;
    
    const fetchProject = async () => {
      try {
        setLoading(true);
        const token = authService.getToken();
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            authService.logout();
            return;
          } else if (response.status === 404) {
            throw new Error('Project not found');
          }
          throw new Error('Failed to fetch project');
        }
        
        const data = await response.json();
        setProject(data);
        
        // Fetch flow data
        await fetchProjectFlow(projectId);
      } catch (error) {
        console.error('Error fetching project:', error);
        setError(error instanceof Error ? error.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId, navigate, fetchProjectFlow]);
  
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);
  
  const handleSaveFlow = async () => {
    if (!projectId) return;
    
    try {
      setSaving(true);
      setSaveSuccess('');
      const token = authService.getToken();
      
      // Create a serializable version of the flow
      const flowData = {
        nodes,
        edges
      };
      
      const response = await fetch(`/api/projects/${projectId}/flow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          flow: JSON.stringify(flowData)
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save flow');
      }
      
      setSaveSuccess('Flow saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error saving flow:', error);
      setError(error instanceof Error ? error.message : 'Failed to save flow');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <p className="text-lg">Loading project...</p>
      </div>
    );
  }
  
  if (error && !project) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="px-4 py-2 bg-purple-600 text-white rounded-md"
        >
          Back to Projects
        </button>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="p-6">
        <div className="text-lg">Project not found</div>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md"
        >
          Back to Projects
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            project.is_private 
              ? 'bg-gray-200 text-gray-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {project.is_private ? 'Private' : 'Public'}
          </span>
          
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <button
            onClick={handleSaveFlow}
            disabled={saving}
            className="ml-3 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors disabled:bg-purple-400"
          >
            {saving ? 'Saving...' : 'Save Flow'}
          </button>
          
          {saveSuccess && (
            <span className="text-sm text-green-600">{saveSuccess}</span>
          )}
          
          {error && !loading && (
            <span className="text-sm text-red-600">{error}</span>
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <ReactFlowProvider>
          <div className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Panel position="top-right">
                <button 
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded"
                  onClick={() => {
                    const newNode = {
                      id: `${nodes.length + 1}`,
                      data: { label: `Node ${nodes.length + 1}` },
                      position: { x: Math.random() * 400, y: Math.random() * 400 },
                    };
                    setNodes((nds) => [...nds, newNode]);
                  }}
                >
                  Add Node
                </button>
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
} 