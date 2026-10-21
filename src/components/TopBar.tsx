import { CircleHelp, Hexagon, LayoutDashboard, Moon, Settings, Sun, Workflow } from 'lucide-react';
import { ThemeName, ViewId } from '../ui/display';

interface TopBarProps {
  view: ViewId;
  theme: ThemeName;
  onView: (view: ViewId) => void;
  onTheme: () => void;
  onHelp: () => void;
}

export function TopBar({ view, theme, onView, onTheme, onHelp }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Hexagon size={16} />
        </span>
        <span>TASKER</span>
      </div>
      <nav className="nav">
        <button className={view === 'graph' ? 'active' : ''} onClick={() => onView('graph')}>
          <Workflow size={15} />
          گراف وظایف
        </button>
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => onView('dashboard')}>
          <LayoutDashboard size={15} />
          داشبورد
        </button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => onView('settings')}>
          <Settings size={15} />
          تنظیمات
        </button>
      </nav>
      <div className="top-spacer" />
      <div className="top-actions">
        <button className="icon-btn" onClick={onTheme} title={theme === 'dark' ? 'تم روشن' : 'تم تیره'}>
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button className="icon-btn" onClick={() => onView('settings')} title="تنظیمات">
          <Settings size={16} />
        </button>
        <button className="icon-btn" onClick={onHelp} title="راهنما">
          <CircleHelp size={16} />
        </button>
        <div className="user-chip">
          <span className="avatar">A</span>
          <span>مدیر سیستم</span>
        </div>
      </div>
    </header>
  );
}
