import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { 
  LayoutDashboard, 
  Globe, 
  Activity, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield,
  Server,
  AlertOctagon,
  Search,
  User,
  Bot
} from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';

const navigation = [
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Infrastructure', href: '/infrastructure', icon: Server },
  { name: 'Incidents', href: '/incidents', icon: AlertOctagon, badge: { count: 3, color: 'bg-red-500' }, secondaryBadge: { count: 1, color: 'bg-red-500' } },
  { name: 'Analytics', href: '/analytics', icon: Activity },
  { name: 'Alerts', href: '/alerts', icon: Bell, badge: { count: 1, color: 'bg-yellow-500' } },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate(`/websites?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900 font-sans flex">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col z-50">
           {/* Mobile Sidebar Content - Simplified copy of Desktop */}
           <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
            <span className="text-xl font-bold text-gray-900 flex items-center">
              <div className="bg-blue-600 p-1.5 rounded-lg mr-2">
                 <Shield className="w-5 h-5 text-white" />
              </div>
              Error Watcher
            </span>
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.name}
                  </div>
                   {/* Mobile Badges */}
                   {item.badge && (
                      <span className={`${item.badge.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                        {item.badge.count}
                      </span>
                   )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#F3F4F6] border-r border-transparent">
        {/* Logo */}
        <div className="flex items-center h-20 px-6">
          <div className="bg-blue-600 p-1.5 rounded-lg mr-3 shadow-sm">
             <Shield className="w-5 h-5 text-white" /> 
             {/* Using Shield as generic logo based on 'home icon' description which might be shield for security app */}
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            Error Watcher
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className={`w-5 h-5 mr-3 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  {item.name}
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Secondary Badge (Left side of label in description, but right side is standard) */}
                  {item.secondaryBadge && (
                     <span className={`${item.secondaryBadge.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                        {item.secondaryBadge.count}
                     </span>
                  )}
                  {item.badge && (
                    <span className={`${item.badge.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                      {item.badge.count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* User Panel */}
        <div className="p-4 mt-auto">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
             <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
             </div>
             <button 
               onClick={handleSignOut}
               className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-red-600 rounded-xl transition-colors"
             >
               <LogOut className="w-4 h-4 mr-2" />
               Sign out
             </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen transition-all duration-300">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#F3F4F6]/90 backdrop-blur-sm h-20 px-8 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-xl relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search websites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-sm"
              />
            </div>

            {/* Right Cluster */}
            <div className="flex items-center gap-4 ml-4">
               {/* Notifications */}
               <button 
                 onClick={() => navigate('/alerts')}
                 className="relative p-2 rounded-full hover:bg-white transition-colors text-gray-500"
               >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F3F4F6]"></span>
               </button>

               {/* Avatar & PRO+ */}
               <div 
                 onClick={() => navigate('/settings')}
                 className="flex items-center gap-2 pl-2 border-l border-gray-200 cursor-pointer"
               >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5">
                     <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-600" />
                     </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700">PRO+</span>
               </div>

               {/* Settings */}
               <button 
                 onClick={() => navigate('/settings')}
                 className="p-2 rounded-full hover:bg-white transition-colors text-gray-500"
               >
                  <Settings className="w-5 h-5" />
               </button>
            </div>
            
            {/* Mobile Menu Button */}
             <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ml-4"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
        </header>

        <main className="flex-1 px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
