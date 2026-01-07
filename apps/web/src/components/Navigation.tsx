import { LayoutDashboard, Users, Settings, Sun, Moon } from 'lucide-react';
import { useDashboardStore } from '../stores/useDashboardStore';
import type { PageType } from '../types';

interface NavItem {
  id: PageType;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'accounts', label: 'Accounts', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const { currentPage, setCurrentPage, preferences, setPreference } = useDashboardStore();
  
  const toggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    setPreference('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`nav-tab flex items-center gap-2 ${isActive ? 'active' : ''}`}
          >
            <Icon size={14} />
            {item.label}
          </button>
        );
      })}
      
      <div className="h-6 w-px bg-white/10 mx-2" />
      
      <button
        onClick={toggleTheme}
        className="btn-icon"
        title={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {preferences.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </nav>
  );
}
