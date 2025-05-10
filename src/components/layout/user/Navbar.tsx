import React, { useState } from 'react';
import supabase from '../../../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

const UserNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentEscuelaId = searchParams.get('escuelaId') || '';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate('/');
  };

  const handleNavigate = (section: string) => {
    console.log('Navigating to section:', section);
    setIsMenuOpen(false);

    // Handle "Home" button navigation
    if (section === '/homeU') {
      if (location.pathname === '/dashboardUZ') {
        navigate('/crearE');
        return;
      }
      if (location.pathname === '/crearE' && currentEscuelaId) {
        navigate(`/dashboardUZ?escuelaId=${currentEscuelaId}&section=inicio`);
        return;
      }
      navigate('/crearE');
      return;
    }

    // Handle other navigation
    const params = new URLSearchParams();
    if (currentEscuelaId) params.append('escuelaId', currentEscuelaId);

    // If the section starts with '/', treat it as an absolute route but preserve escuelaId
    if (section.startsWith('/')) {
      const url = `${section}${currentEscuelaId ? `?escuelaId=${currentEscuelaId}` : ''}`;
      console.log('Generated URL:', url);
      navigate(url);
    } else {
      // For sections like 'reportes', 'estadisticas', etc.
      params.append('section', section);
      const url = `/dashboardUZ?${params.toString()}`;
      console.log('Generated URL:', url);
      navigate(url);
    }
  };

  const menuItems = [
    { name: 'Home', link: '/homeU' },
    { name: 'Crear Alumnos', link: '/alumno' },
    { name: 'Generador de Exámenes', link: '/GExamenes' },
    { name: 'Generador de Planeaciones', link: '/GPlaneaciones' },
    { name: 'Registro de Calificaciones', link: '/Calificaciones' },
    { name: 'Generar Reportes Desempeño', link: '/ReportesD' },
    { name: 'Estadísticas Grupales', link: '/RGrupales' },
    { name: 'Exportar Boletas', link: '/Boletas' },
    { name: 'Control de Asistencia', link: '/CAsistencia' },
    { name: 'Análisis de Participación', link: '/Participacion' },
    { name: 'Registro de Comportamiento', link: '/Comportamiento' },
    { name: 'Ver Perfil', link: '/EPerfil' },
  ];

  return (
    <nav className="bg-blue-900 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-2xl font-semibold tracking-wide">EduConnect</div>
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-full hover:bg-blue-800 transition duration-300 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {isMenuOpen ? (
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
              {menuItems.map((item) => (
                <button
                  key={item.link}
                  onClick={() => {
                    console.log('Clicked:', item.name, item.link);
                    handleNavigate(item.link);
                  }}
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