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
  Connection,
  ColorMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import authService from '../services/authService';
import Note from '../components/nodes/Note';
import Image from '../components/nodes/Image';

// Node types definition
const nodeTypes = {
  note: Note,
  image: Image,
};

// Initial nodes and edges for the flow will be created in the component
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface ProjectData {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  created_at: string;
  tags: string[];
}



export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [colorMode, setColorMode] = useState<ColorMode>('dark');
  
  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle single node deletion (called from within node)
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(node => node.id !== nodeId));
    // Also remove edges connected to the deleted node
    setEdges(eds => eds.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  }, [setNodes, setEdges]);

  // Handler for node data updates
  const handleUpdateNodeData = useCallback((nodeId: string, nodeData: {label?: string, description?: string, imageBase64?: string}) => {
    console.log('Updating node:', nodeId, nodeData);
    setNodes(nds => 
      nds.map(node => {
        if (node.id === nodeId) {
          // Create new data object with all callbacks preserved
          const newData = {
            ...node.data,
            ...nodeData,
          };
          return {
            ...node,
            data: newData
          };
        }
        return node;
      })
    );
  }, [setNodes]);


  
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
            // Add callback functions to all nodes from saved data
            const nodesWithCallbacks = flowData.nodes.map((node: Node) => ({
              ...node,
              data: {
                ...node.data,
                onLabelChange: (id: string, label: string) => handleUpdateNodeData(id, { label }),
                onDescriptionChange: (id: string, description: string) => handleUpdateNodeData(id, { description }),
                onImageChange: (id: string, imageData: string) => handleUpdateNodeData(id, { imageBase64: imageData }),
                onDelete: handleDeleteNode
              }
            }));
            
            setNodes(nodesWithCallbacks);
            setEdges(flowData.edges);
          }
        } catch (err) {
          console.error('Error parsing flow data:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching project flow:', error);
    }
  }, [navigate, setNodes, setEdges, handleUpdateNodeData, handleDeleteNode]);
  
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
        setNewName(data.name);
        setNewDescription(data.description || '');
        
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

  // Handle node deletion when delete key is pressed
  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    const nodeIds = nodesToDelete.map(node => node.id);
    setNodes(nds => nds.filter(node => !nodeIds.includes(node.id)));
    // Also remove edges connected to deleted nodes
    setEdges(eds => eds.filter(edge => 
      !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
    ));
  }, [setNodes, setEdges]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    const edgeIds = edgesToDelete.map(edge => edge.id);
    setEdges(eds => eds.filter(edge => !edgeIds.includes(edge.id)));
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

  const handleUpdateProject = async (updateData: {name?: string, description?: string}) => {
    if (!projectId || !project) return;
    
    try {
      const token = authService.getToken();
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project');
      }
      
      const updatedProject = await response.json();
      setProject(updatedProject);
      
      // Show success message briefly
      setSaveSuccess('Project updated successfully!');
      setTimeout(() => {
        setSaveSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to update project');
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  const handleSaveName = () => {
    if (newName.trim() === '') return;
    handleUpdateProject({ name: newName });
    setEditingName(false);
  };
  
  const handleSaveDescription = () => {
    handleUpdateProject({ description: newDescription });
    setEditingDescription(false);
  };
  
  // Create a new note node
  const addNoteNode = () => {
    const newNodeId = `node-${nodes.length + 1}`;
    const newNode = {
      id: newNodeId,
      type: 'note',
      position: { 
        x: Math.random() * 300 + 50, 
        y: Math.random() * 300 + 50 
      },
      data: { 
        label: 'New Note', 
        description: 'Click to edit description',
        onLabelChange: (id: string, label: string) => handleUpdateNodeData(id, { label }),
        onDescriptionChange: (id: string, description: string) => handleUpdateNodeData(id, { description }),
        onDelete: handleDeleteNode
      }
    };
    
    setNodes(nds => [...nds, newNode]);
  };

  // Create a new image node
  const addImageNode = () => {
    const newNodeId = `image-${nodes.length + 1}`;
    const newNode = {
      id: newNodeId,
      type: 'image',
      position: { 
        x: Math.random() * 300 + 50, 
        y: Math.random() * 300 + 50 
      },
      data: { 
        label: 'New Image',
        onLabelChange: (id: string, label: string) => handleUpdateNodeData(id, { label }),
        onImageChange: (id: string, imageData: string) => handleUpdateNodeData(id, { imageBase64: imageData }),
        onDelete: handleDeleteNode
      }
    };
    
    setNodes(nds => [...nds, newNode]);
  };

  // Toggle color mode
  const toggleColorMode = () => {
    setColorMode(current => current === 'dark' ? 'light' : 'dark');
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
        <div className="flex-1">
          <div className="flex items-center">
            {editingName ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-2xl font-semibold w-full mr-2 border-b border-purple-400 focus:outline-none"
                  autoFocus
                />
                <button 
                  onClick={handleSaveName}
                  className="text-green-500 hover:text-green-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <h1 className="text-2xl font-semibold">{project.name}</h1>
                <button 
                  onClick={() => setEditingName(true)}
                  className="ml-2 text-gray-400 hover:text-purple-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center mt-1">
            {editingDescription ? (
              <div className="flex items-center w-full">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="text-gray-600 w-full mr-2 border-b border-purple-400 focus:outline-none"
                  placeholder="Add a description..."
                  autoFocus
                />
                <button 
                  onClick={handleSaveDescription}
                  className="text-green-500 hover:text-green-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <p className="text-gray-600 min-h-[1.5rem]">
                  {project.description || 'No description'}
                </p>
                <button 
                  onClick={() => setEditingDescription(true)}
                  className="ml-2 text-gray-400 hover:text-purple-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
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
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              deleteKeyCode="Delete"
              multiSelectionKeyCode="Shift"
              colorMode={colorMode}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Panel position="top-right" className="flex gap-2">
                <button 
                  className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                  onClick={addNoteNode}
                >
                  Add Note
                </button>
                <button 
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  onClick={addImageNode}
                >
                  Add Image
                </button>
                <button 
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  onClick={() => {
                    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
                    if (!viewport) return;
                    
                    import('html-to-image').then(({ toPng }) => {
                      toPng(viewport, {
                        backgroundColor: colorMode === 'light' ? '#ffffff' : '#1a1a1a',
                        width: 1024,
                        height: 768,
                      }).then((dataUrl) => {
                        const a = document.createElement('a');
                        a.setAttribute('download', 'mindmap.png');
                        a.setAttribute('href', dataUrl);
                        a.click();
                      });
                    });
                  }}
                  title="Download mindmap as image"
                >
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </div>
                </button>
                <button 
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                  onClick={toggleColorMode}
                  title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <div className="flex items-center gap-1">
                    {colorMode === 'dark' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                    {colorMode === 'dark' ? 'Light' : 'Dark'}
                  </div>
                </button>
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
} 