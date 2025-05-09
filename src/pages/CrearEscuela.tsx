import React, { useEffect, useState } from 'react';
import supabase from '../services/supabase';
import { useNavigate } from 'react-router-dom';

interface Escuela {
  id: string;
  nombre: string;
  estado: string;
}

const CreateSchoolDashboard: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState('');
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [filteredEscuelas, setFilteredEscuelas] = useState<Escuela[]>([]);
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [escuelaToDelete, setEscuelaToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  // Lista de los 32 estados de México
  const estadosMexico = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 
    'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 
    'Tlaxcala', 'Inicio', 'Yucatán', 'Zacatecas'
  ];

  // Verificar autenticación, rol y cargar escuelas
  useEffect(() => {
    const checkUserAndFetchEscuelas = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          navigate('/');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('rol')
          .eq('id', user.id)
          .single();

        if (userError || !userData || userData.rol !== 'profesor') {
          await supabase.auth.signOut();
          navigate('/');
          return;
        }

        // Fetch escuelas asociadas al usuario
        const { data: escuelasData, error: escuelasError } = await supabase
          .from('users_escuelas')
          .select('escuelas(id, nombre, estado)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (escuelasError) {
          setError('Error al cargar las escuelas');
          console.error(escuelasError);
          return;
        }

        const escuelasList = escuelasData?.map((item) => item.escuelas) || [];
        setEscuelas(escuelasList);
        setFilteredEscuelas(escuelasList);
      } catch (err) {
        setError('Error inesperado al cargar los datos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchEscuelas();
  }, [navigate]);

  // Filtrar escuelas por estado
  useEffect(() => {
    if (filterEstado === 'todos') {
      setFilteredEscuelas(escuelas);
    } else {
      setFilteredEscuelas(escuelas.filter((escuela) => escuela.estado === filterEstado));
    }
  }, [filterEstado, escuelas]);

  const handleCrearEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Usuario no autenticado');

      // Insertar nueva escuela
      const { data: escuelaData, error: escuelaError } = await supabase
        .from('escuelas')
        .insert({ nombre, estado })
        .select()
        .single();

      if (escuelaError) throw new Error(escuelaError.message);

      const escuelaId = escuelaData.id;

      // Asociar escuela al usuario
      const { error: linkError } = await supabase
        .from('users_escuelas')
        .insert({ user_id: user.id, escuela_id: escuelaId });

      if (linkError) {
        // Si la escuela ya está asociada (violación de unique constraint), ignorar el error
        if (linkError.code !== '23505') {
          throw new Error(linkError.message);
        }
      }

      // Agregar la nueva escuela a la lista
      const newEscuela = { id: escuelaId, nombre, estado };
      setEscuelas((prev) => [newEscuela, ...prev]);
      setFilteredEscuelas((prev) => filterEstado === 'todos' || filterEstado === estado ? [newEscuela, ...prev] : prev);
      setNombre('');
      setEstado('');
    } catch (err: any) {
      setError(err.message || 'Error al crear la escuela');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (escuelaId: string) => {
    navigate(`/homeU?escuelaId=${escuelaId}`);
  };

  const handleDeleteClick = (escuelaId: string) => {
    setEscuelaToDelete(escuelaId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!escuelaToDelete) return;

    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Usuario no autenticado');

      // Eliminar la asociación en users_escuelas
      const { error: deleteError } = await supabase
        .from('users_escuelas')
        .delete()
        .eq('user_id', user.id)
        .eq('escuela_id', escuelaToDelete);

      if (deleteError) throw new Error(deleteError.message);

      // Actualizar la lista de escuelas
      setEscuelas((prev) => prev.filter((escuela) => escuela.id !== escuelaToDelete));
      setFilteredEscuelas((prev) => prev.filter((escuela) => escuela.id !== escuelaToDelete));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la escuela');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setEscuelaToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setEscuelaToDelete(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-gray-100">
      <div className="p-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">Gestionar Escuelas</h1>

          {/* Formulario para crear escuela */}
          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Crear Nueva Escuela</h2>
            <form onSubmit={handleCrearEscuela} className="space-y-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                  Nombre de la Escuela
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  placeholder="Ejemplo: Escuela Primaria X"
                  required
                />
              </div>
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  required
                >
                  <option value="" disabled>Selecciona un estado</option>
                  {estadosMexico.map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200"
              >
                {loading ? 'Creando...' : 'Crear Escuela'}
              </button>
            </form>
          </div>

          {/* Filtro por estado */}
          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Filtrar Escuelas por Estado</h2>
            <div className="max-w-xs mx-auto">
              <label htmlFor="filterEstado" className="block text-sm font-medium text-gray-700">
                Seleccionar Estado
              </label>
              <select
                id="filterEstado"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              >
                <option value="todos">Todos los estados</option>
                {estadosMexico.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de escuelas */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tus Escuelas</h2>
            {loading ? (
              <p className="text-center text-gray-600">Cargando escuelas...</p>
            ) : filteredEscuelas.length === 0 ? (
              <p className="text-center text-gray-600">No hay escuelas para mostrar.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEscuelas.map((escuela) => (
                  <div
                    key={escuela.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-center justify-between space-x-4"
                  >
                    <div
                      onClick={() => handleCardClick(escuela.id)}
                      className="flex items-center space-x-4 cursor-pointer hover:bg-blue-100 transition duration-200 flex-grow"
                    >
                      <svg
                        className="w-10 h-10 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5zm0 13l-10 5v-5l10-5 10 5v5l-10-5z"/>
                      </svg>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-800">{escuela.nombre}</h3>
                        <p className="text-sm text-gray-600">{escuela.estado}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(escuela.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar esta escuela? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSchoolDashboard;