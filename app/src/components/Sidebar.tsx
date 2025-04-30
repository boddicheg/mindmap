import { NavLink } from 'react-router-dom';
import {
  FolderIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import authService from '../services/authService';

const navigation = [
  { name: 'Projects', href: '/', icon: FolderIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export default function Sidebar() {
  return (
    <div className="flex flex-col w-64 bg-[#1a1f2e] text-white">
      <div className="p-4">
        <img src="/logo.svg" alt="Logo" className="h-8" />
      </div>
      
      <nav className="flex-1 space-y-1 px-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`
            }
          >
            <item.icon className="mr-3 h-6 w-6" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="flex flex-col">
          <div className="pb-3 border-b border-gray-700">
            <div className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors">
              <UserCircleIcon className="h-8 w-8" />
              <div className="text-sm">
                <p className="font-medium truncate">{authService.getUser()?.username || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{authService.getUser()?.email || ''}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => authService.logout()}
            className="mt-3 flex items-center text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
} 