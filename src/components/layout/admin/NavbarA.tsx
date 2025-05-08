import React, { useState } from 'react';
import supabase from '../../../services/supabase';
import { useNavigate } from 'react-router-dom';

// Ícono de Cerrar Sesión
const LogoutIcon = () => (
  <svg
    className="w-6 h-6 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const AdminNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
    setIsMenuOpen(false); // Cierra el menú al cerrar sesión
  };

  const handleMenuItemClick = () => {
    setIsMenuOpen(false); // Cierra el menú al seleccionar una opción
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo o Título */}
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-extrabold bg-white text-indigo-600 px-3 py-1 rounded-lg">
              EC
            </div>
            <span className="text-xl font-semibold">EduConnect</span>
          </div>

          {/* Menú y Botón de Cerrar Sesión */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white hover:bg-indigo-500 transition duration-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-md shadow-xl ring-1 ring-black ring-opacity-5 transition-opacity duration-200 ease-in-out origin-top-right">
                  <div className="py-1">
                    <a
                      href="/admin/home"
                      onClick={handleMenuItemClick}
                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition duration-150"
                    >
                      Home
                    </a>
                    <a
                      href="/admin/escuelas"
                      onClick={handleMenuItemClick}
                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition duration-150"
                    >
                      Gestionar Escuelas
                    </a>
                    <a
                      href="/admin/codigos"
                      onClick={handleMenuItemClick}
                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition duration-150"
                    >
                      Gestionar Códigos
                    </a>
                    <a
                      href="/admin/usuarios"
                      onClick={handleMenuItemClick}
                      className="block px-4 py-2 text-sm hover:bg-gray-100 transition duration-150"
                    >
                      Gestionar Usuarios
                    </a>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition duration-150"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white hover:bg-indigo-500 transition duration-200"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;