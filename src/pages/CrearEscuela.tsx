import React, { useEffect, useState } from 'react';
import  supabase  from '../services/supabase';
import { useNavigate } from 'react-router-dom';


const CreateSchoolDashboard: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState('');
  const [escuelaCreada, setEscuelaCreada] = useState<{ id: string; nombre: string; estado: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    };

    checkUser();
  }, [navigate]);

  const handleCrearEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('escuelas')
        .insert({ nombre, estado })
        .select();

      if (error) throw new Error(error.message);

      const escuelaId = data[0].id;
      await supabase.from('users_escuelas').insert({ user_id: user.id, escuela_id: escuelaId });

      // Guardar la escuela creada para mostrarla en la card
      setEscuelaCreada({ id: escuelaId, nombre, estado });
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-gray-100">
      <div className="p-8 flex-grow flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
          <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">Crear tu Primera Escuela</h1>
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
              <input
                type="text"
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Ejemplo: Ciudad de México"
                required
              />
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

          {escuelaCreada && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Escuela Creada</h2>
              <div
                onClick={() => handleCardClick(escuelaCreada.id)}
                className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-center space-x-4 cursor-pointer hover:shadow-lg hover:bg-blue-100 transition duration-200"
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
                  <h3 className="text-lg font-semibold text-blue-800">{escuelaCreada.nombre}</h3>
                  <p className="text-sm text-gray-600">{escuelaCreada.estado}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSchoolDashboard;