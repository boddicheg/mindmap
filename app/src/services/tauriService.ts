// Tauri API detection and initialization
let invoke: any = null;

// Function to initialize Tauri API
function initTauriAPI() {
  // Try multiple ways to access Tauri API (Tauri 2 compatibility)
  if (typeof window !== 'undefined') {
    // Method 1: Standard Tauri 1.x way
    if ((window as any).__TAURI__) {
      invoke = (window as any).__TAURI__.invoke;
      console.log('Tauri API initialized successfully (method 1)');
      return true;
    }
    
    // Method 2: Tauri 2.x way (if different)
    if ((window as any).__TAURI_INTERNALS__) {
      invoke = (window as any).__TAURI_INTERNALS__.invoke;
      console.log('Tauri API initialized successfully (method 2)');
      return true;
    }
    
    // Method 3: Check for any Tauri-related objects
    const tauriKeys = Object.keys(window).filter(key => key.includes('TAURI'));
    console.log('Available Tauri keys:', tauriKeys);
    
    if (tauriKeys.length > 0) {
      console.log('Found Tauri keys but no invoke function');
    }
  }
  
  console.log('Tauri API not found, window.__TAURI__:', (window as any).__TAURI__);
  return false;
}

// Try to initialize immediately
console.log('Initializing Tauri API...');
const initialized = initTauriAPI();
console.log('Tauri API initialization result:', initialized);

// Also try to initialize when the window loads (in case it's not ready yet)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('Window loaded, checking for Tauri API...');
    if (!invoke) {
      initTauriAPI();
    }
  });
  
  // Also try on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for Tauri API...');
    if (!invoke) {
      initTauriAPI();
    }
  });
}

// Types for API calls
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    created_at: string;
  };
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  is_private?: boolean;
  tags?: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  user_id: number;
  created_at: string;
  tags: string[];
}

export interface SaveFlowRequest {
  flow: string;
}

export interface UploadImageRequest {
  nodeId: string;
  imageData: string;
}

// Tauri API Service
export class TauriService {
  // Check if Tauri API is available
  static isAvailable(): boolean {
    return !!invoke;
  }

  // Initialize Tauri API (can be called manually if needed)
  static init(): boolean {
    return initTauriAPI();
  }

  // Force refresh Tauri API (useful if it wasn't detected initially)
  static refresh(): boolean {
    console.log('Forcing Tauri API refresh...');
    return initTauriAPI();
  }

  // Wait for Tauri API to be available
  static async waitForAPI(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (invoke) {
        console.log('Tauri API is now available');
        return true;
      }
      
      // Try to initialize
      if (initTauriAPI()) {
        return true;
      }
      
      // Wait a bit before trying again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.error('Tauri API not available after waiting', timeoutMs, 'ms');
    return false;
  }

  // Debug method to check Tauri API status
  static debug(): { invoke: boolean; window: boolean; tauri: boolean; tauriObject: any } {
    return {
      invoke: !!invoke,
      window: typeof window !== 'undefined',
      tauri: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      tauriObject: typeof window !== 'undefined' ? (window as any).__TAURI__ : null
    };
  }

  // Authentication
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('register', { payload: data });
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('login', { payload: data });
  }

  static async getProfile(token: string) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('get_profile', { token });
  }

  static async updateEmail(token: string, email: string) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('update_email', { token, payload: { email } });
  }

  static async deleteAccount(token: string) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('delete_account', { token });
  }

  // Projects
  static async getProjects(token: string): Promise<ProjectResponse[]> {
    console.log('TauriService.getProjects called with token:', token ? 'present' : 'missing');
    console.log('invoke function available:', !!invoke);
    console.log('window.__TAURI__ available:', !!(window as any).__TAURI__);
    
    if (!invoke) {
      console.error('Tauri API not available. Current window object keys:', Object.keys(window));
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    
    try {
      const result = await invoke('get_projects', { token });
      console.log('get_projects result:', result);
      return result;
    } catch (error) {
      console.error('Error calling get_projects:', error);
      throw error;
    }
  }

  static async createProject(token: string, data: CreateProjectRequest): Promise<ProjectResponse> {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('create_project', { token, payload: data });
  }

  static async getProject(token: string, projectId: number): Promise<ProjectResponse> {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('get_project', { token, projectId });
  }

  static async updateProject(token: string, projectId: number, data: Partial<CreateProjectRequest>) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('update_project', { token, projectId, payload: data });
  }

  static async deleteProject(token: string, projectId: number) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('delete_project', { token, projectId });
  }

  // Project Flows
  static async getProjectFlow(token: string, projectId: number) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('get_project_flow', { token, projectId });
  }

  static async saveProjectFlow(token: string, projectId: number, data: SaveFlowRequest) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('save_project_flow', { token, projectId, payload: data });
  }

  // Image Upload
  static async uploadImage(token: string, data: UploadImageRequest) {
    if (!invoke) {
      throw new Error('Tauri API not available. Make sure you are running this in a Tauri desktop app.');
    }
    return invoke('upload_image', { token, payload: data });
  }
}

// Example usage:
/*
import { TauriService } from './services/tauriService';

// Login
const auth = await TauriService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Create project
const project = await TauriService.createProject(auth.token, {
  name: 'My Project',
  description: 'A new project',
  is_private: false,
  tags: 'tag1,tag2,tag3'
});

// Get projects
const projects = await TauriService.getProjects(auth.token);
*/
