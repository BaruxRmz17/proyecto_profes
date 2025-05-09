import React, { useEffect, useState } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

// Importamos algunos íconos diferentes (Heroicons o Lucide puedes cambiar por los que tengas)
// Si usas Heroicons: npm install @heroicons/react
import { ChartBarIcon, DocumentTextIcon, AcademicCapIcon, PresentationChartBarIcon, BookOpenIcon, EmojiHappyIcon, PencilAltIcon, ClipboardListIcon, ClipboardCheckIcon, UserCircleIcon, UserAddIcon } from '@heroicons/react/outline';
import { CalendarCheckIcon } from 'lucide-react';

const UserDashboard: React.FC = () => {
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [selectedEscuela, setSelectedEscuela] = useState<{ id: string; nombre: string } | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const section = searchParams.get('section') || 'inicio';
  const escuelaId = searchParams.get('escuelaId') || '';

  // Colores suaves y diferentes para cada card
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

  // Lista de secciones + íconos asignados
  const dashboardItems = [
    { name: 'Crear Alumnos', section: 'alumnos', icon: UserAddIcon },
    { name: 'Generador de Exámenes', section: 'examenes', icon: ClipboardCheckIcon },
    { name: 'Generador de Planeaciones', section: 'planeaciones', icon: PencilAltIcon },
    { name: 'Registro de Calificaciones', section: 'calificaciones', icon: ClipboardListIcon },
    { name: 'Generar Reportes', section: 'reportes', icon: ChartBarIcon },
    { name: 'Estadísticas', section: 'estadisticas', icon: PresentationChartBarIcon },
    { name: 'Exportar Boletas', section: 'boletas', icon: DocumentTextIcon },
    { name: 'Control de Asistencia', section: 'asistencia', icon: CalendarCheckIcon },
    { name: 'Análisis de Participación', section: 'participacion', icon: AcademicCapIcon },
    { name: 'Banco de Recursos', section: 'recursos', icon: BookOpenIcon },
    { name: 'Registro de Comportamiento', section: 'comportamiento', icon: EmojiHappyIcon },
    { name: 'Ver Perfil', section: 'perfil', icon: UserCircleIcon },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
      fetchEscuelas(user.id);
      if (escuelaId) {
        fetchEscuelaDetails(escuelaId);
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate, escuelaId]);

  const fetchEscuelas = async (userId: string) => {
    const { data, error } = await supabase
      .from('users_escuelas')
      .select('escuela_id, escuelas!inner(nombre)')
      .eq('user_id', userId);

    if (error) console.error('Error fetching escuelas:', error);
    else setEscuelas(data || []);
  };

  const fetchEscuelaDetails = async (escuelaId: string) => {
    const { data, error } = await supabase
      .from('escuelas')
      .select('id, nombre')
      .eq('id', escuelaId)
      .single();

    if (error) console.error('Error fetching escuela details:', error);
    else setSelectedEscuela(data);
  };

  const handleEscuelaClick = (escuelaId: string) => {
    navigate(`/dashboard/general?escuelaId=${escuelaId}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-700">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fc]"> {/* Fondo gris suave */}
      <div className="p-6 flex-grow">
        {section === 'inicio' && !escuelaId && (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-800">Selecciona una Escuela</h1>
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
          </div>
        )}

        {escuelaId && selectedEscuela && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Dashboard General</h1>
              <h2 className="text-2xl text-gray-700 mb-2 font-semibold">Escuela: <span className="text-gray-900">{selectedEscuela.nombre}</span></h2>
              {userName && (
                <p className="text-lg text-gray-600"> Bienvenido, <span className="font-medium text-gray-800">{userName}</span></p>
              )}
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardItems.map((item, index) => {
                const IconComponent = item.icon;
                const colorClass = cardColors[index % cardColors.length]; // Asigna color sin repetir
                return (
                  <a
                    key={item.section}
                    href={`/dashboard/general?escuelaId=${escuelaId}&section=${item.section}`}
                    className={`rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 cursor-pointer flex flex-col items-center justify-center ${colorClass}`}
                  >
                    <IconComponent className="w-12 h-12 mb-3" />
                    <span className="text-lg font-semibold text-center">{item.name}</span>
                  </a>
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
