import React, { useState, useEffect } from 'react';
import  supabase from '../../../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

const UserNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentEscuelaId = searchParams.get('escuelaId') || '';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleNavigate = (section: string) => {
    const params = new URLSearchParams();
    if (currentEscuelaId) params.append('escuelaId', currentEscuelaId);
    params.append('section', section);
    navigate(`/homeU?${params.toString()}`);
  };

  return (
    <nav className="bg-blue-900 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo o Título */}
        <div className="text-2xl font-semibold tracking-wide">EduConnect</div>

        {/* Menú Desplegable */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-full hover:bg-blue-800 transition duration-300 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {isMenuOpen ? (
              // Icono de "X" para cerrar
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              // Icono de hamburguesa
              <svg
                className="w-7 h-7"
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
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white text-gray-800 rounded-xl shadow-2xl z-20 transform origin-top-right scale-100 transition duration-300">
              {[
                { name: 'Home', link: 'inicio' },
                { name: 'Generar Reportes', link: 'reportes' },
                { name: 'Estadísticas', link: 'estadisticas' },
                { name: 'Exportar Boletas', link: 'boletas' },
                { name: 'Control de Asistencia', link: 'asistencia' },
                { name: 'Análisis de Participación', link: 'participacion' },
                { name: 'Banco de Recursos', link: 'recursos' },
                { name: 'Registro de Comportamiento', link: 'comportamiento' },
                { name: 'Generador de Planeaciones', link: 'planeaciones' },
                { name: 'Registro de Calificaciones', link: 'calificaciones' },
                { name: 'Generador de Exámenes', link: 'examenes' },
                { name: 'Ver Perfil', link: 'perfil' },
                { name: 'Crear Alumnos', link: 'alumnos' },
              ].map((item) => (
                <button
                  key={item.link}
                  onClick={() => handleNavigate(item.link)}
                  className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-md transition duration-200 text-sm font-medium"
                >
                  {item.name}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-md transition duration-200 text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default UserNavbar;