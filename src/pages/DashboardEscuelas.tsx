import React, { useEffect, useState } from 'react';
import  supabase  from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';


const UserDashboard: React.FC = () => {
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [selectedEscuela, setSelectedEscuela] = useState<{ id: string; nombre: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const section = searchParams.get('section') || 'inicio';
  const escuelaId = searchParams.get('escuelaId') || '';

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('rol')
        .eq('id', user.id);

      if (error || !userData || userData.length === 0 || userData[0].rol !== 'profesor') {
        await supabase.auth.signOut();
        navigate('/');
        return;
      }

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
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6 bg-gray-100 flex-grow">
        {section === 'inicio' && !escuelaId && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Selecciona una Escuela</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {escuelas.map((escuela) => (
                <div
                  key={escuela.escuela_id}
                  onClick={() => handleEscuelaClick(escuela.escuela_id)}
                  className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 flex items-center space-x-4"
                >
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zm0 13l-10 5v-5l10-5 10 5v5l-10-5z"/>
                  </svg>
                  <span className="text-lg font-medium">{escuela.escuelas.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {escuelaId && selectedEscuela && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard General - {selectedEscuela.nombre}</h1>
            {section === 'inicio' && (
              <div>
                <p className="text-gray-600 mb-4">Bienvenido al dashboard de {selectedEscuela.nombre}. Selecciona una opción desde el menú para continuar.</p>
              </div>
            )}
            {section === 'reportes' && <div><h2 className="text-2xl font-semibold mb-4">Generar Reportes</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'estadisticas' && <div><h2 className="text-2xl font-semibold mb-4">Estadísticas</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'boletas' && <div><h2 className="text-2xl font-semibold mb-4">Exportar Boletas</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'asistencia' && <div><h2 className="text-2xl font-semibold mb-4">Control de Asistencia</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'participacion' && <div><h2 className="text-2xl font-semibold mb-4">Análisis de Participación</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'recursos' && <div><h2 className="text-2xl font-semibold mb-4">Banco de Recursos</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'comportamiento' && <div><h2 className="text-2xl font-semibold mb-4">Registro de Comportamiento</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'planeaciones' && <div><h2 className="text-2xl font-semibold mb-4">Generador de Planeaciones</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'calificaciones' && <div><h2 className="text-2xl font-semibold mb-4">Registro de Calificaciones</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'examenes' && <div><h2 className="text-2xl font-semibold mb-4">Generador de Exámenes</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'perfil' && <div><h2 className="text-2xl font-semibold mb-4">Ver Perfil</h2><p>Funcionalidad en desarrollo...</p></div>}
            {section === 'alumnos' && <div><h2 className="text-2xl font-semibold mb-4">Crear Alumnos</h2><p>Funcionalidad en desarrollo...</p></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;