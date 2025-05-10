import React, { useEffect, useState } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChartBarIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  PresentationChartBarIcon,
  BookOpenIcon,
  EmojiHappyIcon,
  PencilAltIcon,
  ClipboardListIcon,
  ClipboardCheckIcon,
  UserCircleIcon,
  UserAddIcon,
} from '@heroicons/react/outline';
import { CalendarCheckIcon } from 'lucide-react';

interface Escuela {
  escuela_id: string;
  escuelas: { nombre: string };
}

interface SelectedEscuela {
  id: string;
  nombre: string;
}

const UserDashboard: React.FC = () => {
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [selectedEscuela, setSelectedEscuela] = useState<SelectedEscuela | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const section = searchParams.get('section') || 'inicio';
  const escuelaId = searchParams.get('escuelaId') || '';

  // Colores suaves para las cards
  const cardColors = [
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
    'bg-orange-100 text-orange-800',
    'bg-indigo-100 text-indigo-800',
    'bg-red-100 text-red-800',
    'bg-cyan-100 text-cyan-800',
    'bg-emerald-100 text-emerald-800',
    'bg-amber-100 text-amber-800',
    'bg-rose-100 text-rose-800',
  ];

  // Lista de secciones con íconos
  const dashboardItems = [
    { name: 'Crear Alumno', section: '/alumno', icon: UserAddIcon },
    { name: 'Generador de Exámenes', section: 'examenes', icon: ClipboardCheckIcon },
    { name: 'Generador de Planeaciones', section: 'planeaciones', icon: PencilAltIcon },
    { name: 'Registro de Calificaciones', section: 'calificaciones', icon: ClipboardListIcon },
    { name: 'Generar Reportes de Desempeño', section: 'reportes', icon: ChartBarIcon },
    { name: 'Estadísticas', section: 'estadisticas', icon: PresentationChartBarIcon },
    { name: 'Exportar Boletas', section: 'boletas', icon: DocumentTextIcon },
    { name: 'Control de Asistencia', section: 'asistencia', icon: CalendarCheckIcon },
    { name: 'Análisis de Participación', section: 'participacion', icon: AcademicCapIcon },
    { name: 'Registro de Comportamiento', section: 'comportamiento', icon: EmojiHappyIcon },
    { name: 'Ver Perfil', section: 'perfil', icon: UserCircleIcon },
  ];

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          navigate('/');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('rol, nombre')
          .eq('id', user.id)
          .single();

        if (userError || !userData || userData.rol !== 'profesor') {
          await supabase.auth.signOut();
          navigate('/');
          return;
        }

        setUserName(userData.nombre);
        await fetchEscuelas(user.id);
        if (escuelaId) {
          await fetchEscuelaDetails(escuelaId);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos del usuario');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate, escuelaId]);

  const fetchEscuelas = async (userId: string) => {
    const { data, error } = await supabase
      .from('users_escuelas')
      .select('escuela_id, escuelas!inner(nombre)')
      .eq('user_id', userId);

    if (error) {
      setError('Error al cargar las escuelas');
      console.error('Error fetching escuelas:', error);
      return;
    }

    // Sort escuelas by nombre
    const sortedEscuelas = data
      ? data.sort((a, b) => a.escuelas.nombre.localeCompare(b.escuelas.nombre))
      : [];
    setEscuelas(sortedEscuelas);
  };

  const fetchEscuelaDetails = async (escuelaId: string) => {
    const { data, error } = await supabase
      .from('escuelas')
      .select('id, nombre')
      .eq('id', escuelaId)
      .single();

    if (error) {
      setError('Error al cargar los detalles de la escuela');
      console.error('Error fetching escuela details:', error);
      setSelectedEscuela(null);
      return;
    }

    setSelectedEscuela(data);
  };

  const handleEscuelaClick = (escuelaId: string) => {
    navigate(`/dashboardUZ?escuelaId=${escuelaId}&section=inicio`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fc]">
      <div className="p-6 flex-grow">
        {section === 'inicio' && !escuelaId && (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-800">Selecciona una Escuela</h1>
            {escuelas.length === 0 ? (
              <p className="text-gray-600">
                No tienes escuelas asociadas.{' '}
                <Link to="/crearE" className="text-blue-600 hover:underline">
                  Crea una escuela
                </Link>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {escuelas.map((escuela) => (
                  <div
                    key={escuela.escuela_id}
                    onClick={() => handleEscuelaClick(escuela.escuela_id)}
                    className="bg-white p-5 rounded-lg shadow hover:shadow-lg cursor-pointer border hover:scale-105 transition transform duration-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-800">{escuela.escuelas.nombre}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {escuelaId && !selectedEscuela && (
          <div className="text-center text-red-600">
            Escuela no encontrada. Por favor, selecciona una escuela válida.
          </div>
        )}

        {escuelaId && selectedEscuela && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Dashboard General
              </h1>
              <h2 className="text-2xl text-gray-700 mb-2 font-semibold">
                Escuela: <span className="text-gray-900">{selectedEscuela.nombre}</span>
              </h2>
              {userName && (
                <p className="text-lg text-gray-600">
                  Bienvenido, <span className="font-medium text-gray-800">{userName}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardItems.map((item, index) => {
                const IconComponent = item.icon;
                const colorClass = cardColors[index % cardColors.length];
                return (
                  <Link
                    key={item.section}
                    to={`/DashboardU?escuelaId=${escuelaId}&section=${item.section}`}
                    className={`rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 cursor-pointer flex flex-col items-center justify-center ${colorClass}`}
                  >
                    <IconComponent className="w-12 h-12 mb-3" />
                    <span className="text-lg font-semibold text-center">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;