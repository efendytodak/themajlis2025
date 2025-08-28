import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fuel as Mosque, Home, LogOut } from 'lucide-react';

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, onLogout }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-2">
        <div className="flex items-center justify-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-0 bg-white rounded-xl group-hover:bg-emerald-100 transition-all duration-300">
             <img src="/kubahgreennew.png" alt="kubahgreennew.png" className="w-12 h-12" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">
              themajlis.my
            </span>
          </Link>
          
          <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap absolute right-4 sm:right-6">
            {isLoggedIn ? (
              <>
                {!isDashboardPage && (
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg sm:rounded-xl transition-all duration-300 font-medium border border-emerald-200 text-sm sm:text-base"
                  >
                    <Home className="w-5 h-5" />
                  </Link>
                )}
                <button 
                  onClick={onLogout}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg sm:rounded-xl transition-all duration-300 font-medium border border-red-200 text-sm sm:text-base"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : isHomePage && (
              null
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;