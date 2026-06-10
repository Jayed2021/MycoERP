import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FlaskConical, Layers, Wheat, Box, Sprout, Scissors,
  ClipboardList, PackageOpen, Building2, BookOpen, BarChart3, Users,
  Settings, Bell, LogOut, Menu, X, ChevronRight, Thermometer, AlertTriangle,
  Leaf, ChevronDown, Beaker, ScanLine, QrCode,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRoute';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
  group?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'main' },
  { label: 'Tasks', path: '/tasks', icon: ClipboardList, group: 'main' },
  { label: 'Scan QR', path: '/scan', icon: ScanLine, group: 'main' },
  { label: 'Batches', path: '/batches', icon: Layers, group: 'production' },
  { label: 'Lab / Agar', path: '/batches?type=agar', icon: FlaskConical, group: 'production' },
  { label: 'Liquid Culture', path: '/batches?type=liquid_culture', icon: Beaker, group: 'production' },
  { label: 'Grain Spawn', path: '/batches?type=grain_spawn', icon: Wheat, group: 'production' },
  { label: 'Substrate', path: '/batches?type=substrate', icon: Box, group: 'production' },
  { label: 'Fruiting', path: '/batches?type=fruiting_block', icon: Sprout, group: 'production' },
  { label: 'Harvest', path: '/harvest', icon: Scissors, group: 'production' },
  { label: 'Contamination', path: '/contamination', icon: AlertTriangle, group: 'production' },
  { label: 'Env. Logs', path: '/env-logs', icon: Thermometer, group: 'production' },
  { label: 'Inventory', path: '/inventory', icon: PackageOpen, group: 'resources' },
  { label: 'Rooms', path: '/rooms', icon: Building2, group: 'resources' },
  { label: 'Species & Strains', path: '/species', icon: Leaf, group: 'resources' },
  { label: 'SOP Templates', path: '/templates', icon: BookOpen, group: 'resources' },
  { label: 'QR Codes', path: '/qr', icon: QrCode, group: 'resources', roles: ['admin', 'manager'] },
  { label: 'Reports', path: '/reports', icon: BarChart3, group: 'reporting', roles: ['admin', 'manager'] },
  { label: 'Users', path: '/users', icon: Users, group: 'admin', roles: ['admin'] },
];

const groupLabels: Record<string, string> = {
  main: '',
  production: 'Production',
  resources: 'Resources',
  reporting: 'Reporting',
  admin: 'Administration',
};

interface Props {
  currentPath: string;
  children: React.ReactNode;
}

export function Layout({ currentPath, children }: Props) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [productionExpanded, setProductionExpanded] = useState(true);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data ?? []));
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id).is('read_at', null);
    setNotifications(ns => ns.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  function handleNav(path: string) {
    if (path.includes('?')) {
      const [p, q] = path.split('?');
      const params = Object.fromEntries(new URLSearchParams(q));
      navigate(p, params);
    } else {
      navigate(path);
    }
    setSidebarOpen(false);
  }

  function isActive(item: NavItem): boolean {
    if (item.path.includes('?')) {
      const [p, q] = item.path.split('?');
      const params = new URLSearchParams(q);
      const typeParam = params.get('type');
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      return currentPath === p && urlParams.get('type') === typeParam;
    }
    return currentPath === item.path;
  }

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role ?? '')
  );

  const groups = ['main', 'production', 'resources', 'reporting', 'admin'];

  function renderNavGroup(group: string) {
    const items = visibleItems.filter(i => i.group === group);
    if (items.length === 0) return null;

    const isCollapsible = group === 'production' || group === 'resources';
    const isExpanded = group === 'production' ? productionExpanded : group === 'resources' ? resourcesExpanded : true;
    const toggle = group === 'production' ? () => setProductionExpanded(p => !p) : () => setResourcesExpanded(p => !p);

    return (
      <div key={group} className="mb-1">
        {groupLabels[group] && (
          <button
            onClick={isCollapsible ? toggle : undefined}
            className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5"
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{groupLabels[group]}</span>
            {isCollapsible && (
              <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>
        )}
        {(isExpanded || !isCollapsible) && items.map(item => (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(item)
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <item.icon size={16} className={isActive(item) ? 'text-emerald-600' : 'text-gray-400'} />
            {item.label}
            {isActive(item) && <ChevronRight size={12} className="ml-auto text-emerald-500" />}
          </button>
        ))}
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Sprout size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">MycoERP</p>
            <p className="text-xs text-gray-400">Mushroom Cultivation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {groups.map(renderNavGroup)}
      </nav>

      <div className="border-t border-gray-100 px-3 py-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} className="text-gray-600" />
          </button>

          <div className="flex-1" />

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(n => !n)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell size={18} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-emerald-600 hover:underline">Mark all read</button>
                    )}
                    <button onClick={() => setShowNotifications(false)}>
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read_at ? 'bg-emerald-50/50' : ''}`}>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => handleNav('/users')}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name}</span>
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
