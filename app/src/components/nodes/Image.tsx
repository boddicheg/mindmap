import { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import authService from '../../services/authService';
import { TauriService } from '../../services/tauriService';

interface ImageData {
  label?: string;
  imageUrl?: string;
  imageBase64?: string;
  onLabelChange?: (id: string, label: string) => void;
  onImageChange?: (id: string, imageData: string) => void;
  onDelete?: (id: string) => void;
}

export default function Image({ id, data, isConnectable }: NodeProps) {
  const nodeData = data as unknown as ImageData;
  const [editingLabel, setEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(nodeData.label || 'Image');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sync local state with props when nodeData changes
  useEffect(() => {
    setLocalLabel(nodeData.label || 'Image');
  }, [nodeData.label]);

  const handleLabelSave = () => {
    if (nodeData.onLabelChange && localLabel.trim() !== '') {
      nodeData.onLabelChange(id, localLabel);
    }
    setEditingLabel(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLabelSave();
    }
  };

  const handleDelete = () => {
    if (nodeData.onDelete) {
      nodeData.onDelete(id);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        try {
          // Upload to server
          const token = authService.getToken();
          if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
          }
          
          await TauriService.uploadImage(token, {
            nodeId: id,
            imageData: base64Data
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          // Update node with image data
          if (nodeData.onImageChange) {
            nodeData.onImageChange(id, base64Data);
          }

          setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
          }, 500);

        } catch (error) {
          console.error('Upload error:', error);
          clearInterval(progressInterval);
          setUploading(false);
          setUploadProgress(0);
          alert('Failed to upload image. Please try again.');
        }
      };

      reader.onerror = () => {
        setUploading(false);
        setUploadProgress(0);
        alert('Failed to read file');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const hasImage = nodeData.imageBase64 || nodeData.imageUrl;

  return (
    <div 
      className="bg-gray-700 border border-gray-600 rounded-md shadow-md p-2 text-white relative"
      style={{ 
        minWidth: '200px',
        minHeight: '150px',
        maxWidth: '600px'
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

      {/* Handles */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-blue-500"
      />
      
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-green-500"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-orange-500"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Header */}
      <div className="mb-2">
        {editingLabel ? (
          <div className="flex items-center">
            <input
              type="text"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onKeyDown={handleKeyDown}
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
            <h3 className="text-sm font-medium">{nodeData.label || 'Image'}</h3>
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

      {/* Image Content */}
      <div className="flex-1">
        {hasImage ? (
          <div className="relative">
            <img 
              src={nodeData.imageBase64 || nodeData.imageUrl} 
              alt={nodeData.label || 'Uploaded image'}
              className="rounded border border-gray-500 object-contain"
              style={{ maxHeight: '400px', width: 'auto' }}
            />
            <button
              onClick={openFileDialog}
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-75 text-white p-1 rounded text-xs hover:bg-opacity-100 transition-opacity"
              title="Change image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
              dragOver 
                ? 'border-purple-400 bg-purple-900 bg-opacity-20' 
                : 'border-gray-500 hover:border-purple-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            {uploading ? (
              <div className="space-y-2">
                <div className="w-8 h-8 mx-auto text-purple-400">
                  <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="text-xs text-gray-300">Uploading...</div>
                <div className="w-full bg-gray-600 rounded-full h-1">
                  <div 
                    className="bg-purple-500 h-1 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400">{uploadProgress}%</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-8 h-8 mx-auto text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-xs text-gray-300">Upload Image</div>
                <div className="text-xs text-gray-400">Click or drag to upload</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
        }}
        className="hidden"
      />

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
