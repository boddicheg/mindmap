import { NavLink } from 'react-router-dom';
import {
  FolderIcon,
  ArrowPathIcon,
  CogIcon,
  ServerIcon,
  QuestionMarkCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Workflows', href: '/workflows', icon: ArrowPathIcon },
  { name: 'Monitoring', href: '/monitoring', icon: ServerIcon },
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
        <div className="flex items-center space-x-4">
          <QuestionMarkCircleIcon className="h-6 w-6" />
          <BellIcon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
} 