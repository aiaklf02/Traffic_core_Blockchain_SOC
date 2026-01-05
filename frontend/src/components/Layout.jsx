import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Simulation', path: '/simulation', icon: '🚦' },
  { name: 'Consensus', path: '/consensus', icon: '🔬' },
  { name: 'Security', path: '/security', icon: '🛡️' },
  { name: 'Roads', path: '/roads', icon: '🛣️' },
  { name: 'Sensors', path: '/sensors', icon: '📡' },
  { name: 'Registry', path: '/registry', icon: '📋' },
];

function Layout({ children }) {
  const { pathname } = useLocation();

  // Check if current path matches (exact for root, prefix for others)
  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="bg-gray-800 text-white shadow-lg border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Traffic Core
            </h1>
          </Link>
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-gray-800 border-t border-gray-700 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Traffic Core - Smart City Blockchain Simulator
      </footer>
    </div>
  );
}

export default Layout;
