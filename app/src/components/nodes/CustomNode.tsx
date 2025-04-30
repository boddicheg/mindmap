import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface CustomNodeData {
  label?: string;
  description?: string;
  onLabelChange?: (id: string, label: string) => void;
  onDescriptionChange?: (id: string, description: string) => void;
}

export default function CustomNode({ id, data, isConnectable }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [localLabel, setLocalLabel] = useState(nodeData.label || 'Node');
  const [localDescription, setLocalDescription] = useState(nodeData.description || '');

  const handleLabelSave = () => {
    if (nodeData.onLabelChange) {
      nodeData.onLabelChange(id, localLabel);
    }
    setEditingLabel(false);
  };

  const handleDescriptionSave = () => {
    if (nodeData.onDescriptionChange) {
      nodeData.onDescriptionChange(id, localDescription);
    }
    setEditingDescription(false);
  };

  // Handle Enter key press to save
  const handleKeyDown = (event: React.KeyboardEvent, type: 'label' | 'description') => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (type === 'label') {
        handleLabelSave();
      } else {
        handleDescriptionSave();
      }
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-md p-3 min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-blue-500"
      />
      
      <div className="mb-2">
        {editingLabel ? (
          <div className="flex items-center">
            <input
              type="text"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'label')}
              className="text-lg font-medium w-full border-b border-purple-400 focus:outline-none mr-2"
              autoFocus
            />
            <button 
              onClick={handleLabelSave}
              className="text-green-500 hover:text-green-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{nodeData.label || 'Node'}</h3>
            <button 
              onClick={() => setEditingLabel(true)}
              className="text-gray-400 hover:text-purple-600 ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <div>
        {editingDescription ? (
          <div className="flex items-center">
            <input
              type="text"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'description')}
              className="text-sm text-gray-700 w-full border-b border-purple-400 focus:outline-none mr-2"
              placeholder="Add a description..."
              autoFocus
            />
            <button 
              onClick={handleDescriptionSave}
              className="text-green-500 hover:text-green-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 min-h-[1.5rem]">
              {nodeData.description || 'No description'}
            </p>
            <button 
              onClick={() => setEditingDescription(true)}
              className="text-gray-400 hover:text-purple-600 ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-blue-500"
      />
    </div>
  );
} 