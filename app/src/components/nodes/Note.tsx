import { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface NoteData {
  label?: string;
  description?: string;
  onLabelChange?: (id: string, label: string) => void;
  onDescriptionChange?: (id: string, description: string) => void;
  onDelete?: (id: string) => void;
}

export default function Note({ id, data, isConnectable }: NodeProps) {
  const nodeData = data as unknown as NoteData;
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [localLabel, setLocalLabel] = useState(nodeData.label || 'Note');
  const [localDescription, setLocalDescription] = useState(nodeData.description || '');
  const [copySuccess, setCopySuccess] = useState(false);
  const [shouldWrap, setShouldWrap] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Sync local state with props when nodeData changes
  useEffect(() => {
    setLocalLabel(nodeData.label || 'Note');
    setLocalDescription(nodeData.description || '');
  }, [nodeData.label, nodeData.description]);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current && editingDescription) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localDescription, editingDescription]);

  // Calculate if text should wrap based on length
  useEffect(() => {
    const description = nodeData.description || '';
    // If description is longer than 20 characters, enable text wrapping
    setShouldWrap(description.length > 20);
  }, [nodeData.description]);

  const handleLabelSave = () => {
    if (nodeData.onLabelChange && localLabel.trim() !== '') {
      nodeData.onLabelChange(id, localLabel);
    }
    setEditingLabel(false);
  };

  const handleDescriptionSave = () => {
    if (nodeData.onDescriptionChange) {
      nodeData.onDescriptionChange(id, localDescription);
    }
    setEditingDescription(false);
    
    // Check if we need to enable text wrapping after save
    setShouldWrap(localDescription.length > 20);
  };

  // Handle Enter key press to save for label input
  const handleKeyDown = (event: React.KeyboardEvent, type: 'label') => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (type === 'label') {
        handleLabelSave();
      }
    }
  };

  // Special handler for textarea to allow Enter for new lines
  // Ctrl+Enter or Cmd+Enter to save
  const handleTextareaKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleDescriptionSave();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(nodeData.description || '');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDelete = () => {
    if (nodeData.onDelete) {
      nodeData.onDelete(id);
    }
  };

  // Calculate dynamic width based on description length
  const getNodeWidth = () => {
    const baseWidth = 180;
    const descLength = (nodeData.description || '').length;
    
    if (descLength <= 20) return baseWidth;
    
    // Increase width for longer descriptions, but cap it
    const additionalWidth = Math.min(descLength * 2, 200);
    return baseWidth + additionalWidth;
  };

  const width = getNodeWidth();

  return (
    <div 
      className="bg-gray-700 border border-gray-600 rounded-md shadow-md p-2 text-white relative"
      style={{ 
        minWidth: '180px',
        width: shouldWrap ? `${width}px` : 'auto',
        maxWidth: '380px'
      }}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute -top-3 -right-3 text-gray-400 hover:text-red-400 transition-colors z-10 bg-white rounded-full p-1 border border-gray-300 shadow-sm"
        title="Delete node"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Top handle */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-blue-500"
      />
      
      {/* Left handle */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-green-500"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* Right handle */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-orange-500"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <div className="mb-1">
        {editingLabel ? (
          <div className="flex items-center">
            <input
              type="text"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'label')}
              className="text-sm font-medium w-full border-b border-purple-400 focus:outline-none mr-2 bg-gray-700 text-white"
              autoFocus
            />
            <button 
              onClick={handleLabelSave}
              className="text-green-400 hover:text-green-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{nodeData.label || 'Note'}</h3>
            <button 
              onClick={() => setEditingLabel(true)}
              className="text-gray-300 hover:text-purple-300 ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <div>
        {editingDescription ? (
          <div className="flex">
            <div className="flex-grow mr-2">
              <textarea
                ref={textareaRef}
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                className="text-xs text-gray-200 w-full border-b border-purple-400 focus:outline-none bg-gray-700 resize-none overflow-hidden"
                placeholder="Add a description..."
                rows={1}
                style={{ minHeight: '1.5rem' }}
                autoFocus
              />
              <div className="text-xs text-gray-400 mt-1">
                Press Ctrl+Enter to save
              </div>
            </div>
            <button 
              onClick={handleDescriptionSave}
              className="text-green-400 hover:text-green-300 self-start"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <p 
                ref={descriptionRef}
                className={`text-xs text-gray-300 min-h-[1.2rem] ${shouldWrap ? 'break-words' : 'truncate'}`}
                style={{ maxWidth: shouldWrap ? 'calc(100% - 20px)' : '140px', whiteSpace: shouldWrap ? 'pre-wrap' : 'nowrap' }}
              >
                {nodeData.description || 'No description'}
              </p>
              <div className="flex items-center shrink-0">
                <button 
                  onClick={copyToClipboard}
                  className={`text-gray-300 hover:text-blue-300 ml-1 ${copySuccess ? 'text-green-400' : ''}`}
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                <button 
                  onClick={() => setEditingDescription(true)}
                  className="text-gray-300 hover:text-purple-300 ml-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom handle */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-blue-500"
      />
    </div>
  );
} 