import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../services/supabase';

// Íconos (puedes reemplazar con react-icons o personalizar)
const HomeIcon = () => (
  <svg
    className="w-8 h-8 text-indigo-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 12l2-2m0 0l7-7 7 7m-9 8v-8m0 0l-7 7m7-7l7 7"
    />
  </svg>
);

const SchoolIcon = () => (
  <svg
    className="w-8 h-8 text-blue-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m4.5 0V6.253c-1.332-.717-2.918-1.253-4.5-1.253M15 6.253c1.332-.717 2.918-1.253 4.5-1.253C19.832 5.477 21.5 6 21.5 6v13c-1.168-.717-2.918-1.253-4.5-1.253"
    />
  </svg>
);

const CodeIcon = () => (
  <svg
    className="w-8 h-8 text-green-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
    />
  </svg>
);

const UserIcon = () => (
  <svg
    className="w-8 h-8 text-purple-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Verificar autenticación y rol (similar a antes, pero simplificado)
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/admin/login');
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('rol')
          .eq('id', user.id)
          .single();

        if (error || !userData || userData.rol !== 'admin') {
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/admin/login');
      }
    };

    checkUser();
  }, [navigate]);

  // Manejadores de navegación para cada tarjeta
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Panel de Administración</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Tarjeta Home */}
        <div
          onClick={() => handleNavigate('/admin/home')}
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col items-center justify-center text-center"
        >
          <HomeIcon />
          <h3 className="mt-4 text-lg font-semibold text-gray-700">Home</h3>
        </div>

        {/* Tarjeta Escuelas */}
        <div
          onClick={() => handleNavigate('/admin/escuelas')}
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col items-center justify-center text-center"
        >
          <SchoolIcon />
          <h3 className="mt-4 text-lg font-semibold text-gray-700">Escuelas</h3>
        </div>

        {/* Tarjeta Códigos */}
        <div
          onClick={() => handleNavigate('/admin/codigos')}
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col items-center justify-center text-center"
        >
          <CodeIcon />
          <h3 className="mt-4 text-lg font-semibold text-gray-700">Códigos</h3>
        </div>

        {/* Tarjeta Usuarios */}
        <div
          onClick={() => handleNavigate('/admin/usuarios')}
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col items-center justify-center text-center"
        >
          <UserIcon />
          <h3 className="mt-4 text-lg font-semibold text-gray-700">Usuarios</h3>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;