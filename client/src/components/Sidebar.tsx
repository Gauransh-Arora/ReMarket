import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  BarChart2,
  Users,
  Settings,
  Search,
  Star,
  Zap,
  Plus,
  Tag
} from 'lucide-react';

const navItems = [
  { label: 'Inventory', icon: Package, view: 'store' as const },
  { label: 'My Listings', icon: Tag, view: 'my-listings' as const },
  { label: 'List Product', icon: Plus, view: 'sell' as const },
  { label: 'Messages', icon: ClipboardList, view: 'chat' as const },
  { label: 'Dashboard', icon: LayoutDashboard, view: 'store' as const },
];

const bookmarks = [
// ...
];

export default function Sidebar({ 
  activeView, 
  onViewChange, 
  unreadCount = 0 
}: { 
  activeView: string, 
  onViewChange: (v: 'store' | 'chat' | 'sell' | 'my-listings') => void,
  unreadCount?: number 
}) {
  const { user, logout } = useAuth();
  const [searchVal, setSearchVal] = useState('');

  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      {/* ── Profile Card ── */}
      <div className="sidebar-profile-card">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-name">{user?.name || user?.email?.split('@')[0]}</div>
          <div className="sidebar-role">{user?.role || 'User'}</div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="sidebar-search">
        <Search size={13} strokeWidth={2} color="var(--text-muted)" />
        <input
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search..."
        />
      </div>

      {/* ── Main Nav ── */}
      <div className="nav-section-label">Menu</div>
      {navItems.map(({ label, icon: Icon, view }) => {
        const displayBadge = label === 'Messages' ? unreadCount : null;
        return (
          <div
            key={label}
            className={`nav-item${((view === 'store' && activeView === 'store' && label === 'Inventory') || (view === 'chat' && activeView === 'chat') || (view === 'sell' && activeView === 'sell')) ? ' active' : ''}`}
            onClick={() => onViewChange(view)}
          >
            <span className="nav-item-icon">
              <Icon size={15} strokeWidth={1.8} />
            </span>
            <span className="nav-item-label">{label}</span>
            {displayBadge && displayBadge > 0 && <span className="nav-badge">{displayBadge}</span>}
          </div>
        );
      })}
      <div 
        className="nav-item" 
        onClick={logout}
        style={{ marginTop: 2, color: 'var(--badge-orange)' }}
      >
        <span className="nav-item-icon" style={{ color: 'var(--badge-orange)' }}>
          <Zap size={15} strokeWidth={1.8} />
        </span>
        <span className="nav-item-label">Logout</span>
      </div>

      <div className="nav-divider" />

      {/* ── Bookmarks ── */}
      <div className="nav-section-label">Bookmarks</div>
      {bookmarks.map(bm => (
        <div key={bm.label} className="nav-item">
          <div
            className="bookmark-icon"
            style={{ background: bm.bg, color: bm.color }}
          >
            <Star size={9} strokeWidth={2} fill="currentColor" />
          </div>
          <span className="nav-item-label">{bm.label}</span>
        </div>
      ))}

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <span className="powered-by">Powered by</span>
        <span className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Zap size={12} strokeWidth={2} color="var(--accent-green)" />
          ReMarket
        </span>
      </div>
    </aside>
  );
}
