import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import AdminDashboard from './components/AdminDashboard';
import AddMajlisForm from './components/AddMajlisForm';
import Header from './components/Header';
import AllMajlisPage from './components/AllMajlisPage';

function App() {
  const { user, loading, signOut, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header isLoggedIn={isAuthenticated} onLogout={signOut} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <LoginPage />
            } 
          />
          <Route 
            path="/signup" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <SignUpPage />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
              <AdminDashboard adminName={user?.email?.split('@')[0] || 'Admin'} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/add-majlis" 
            element={
              isAuthenticated ? 
              <AddMajlisForm /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route path="/all-majlis" element={<AllMajlisPage />} />
        </Routes>
        
        {/* Footer */}
        <footer className="py-2 px-6 bg-white border-t border-gray-100">
          <div className="container mx-auto">
            <div className="text-center">
             
              <div className="flex justify-center space-x-0 opacity-70">
                <a 
                  href="https://www.todak.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-all duration-300"
                >
                  <img src="/footertodak.png" alt="todak" className="w-13 h-11" />
                </a>
                <a 
                  href="#"
                  href="https://www.instagram.com/themajlismalaysia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-all duration-300"
                >
                  <img src="/footertm.png" alt="footer" className="w-13 h-11" />
                </a>
              </div>
              <div className="mt-0 pt-1 border-t border-gray-100">
                <p className="text-gray-500 text-sm">
                  © 2025 The Majlis. An initiative by Todak.
                  {!isAuthenticated && (
                    <>
                      {' '}
                      <Link 
                        to="/login" 
                        className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200"
                      >
                        Admin
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;