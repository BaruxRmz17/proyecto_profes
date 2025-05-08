import React, { useState } from 'react';
import supabase  from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Autenticar con Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Obtener el usuario autenticado
      const user = data.user;
      if (!user) {
        throw new Error('No se pudo obtener el usuario');
      }

      console.log('Usuario autenticado:', user); // Depuración

      // Verificar el rol del usuario en la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('rol')
        .eq('id', user.id);

      if (userError) {
        throw new Error(`Error en la base de datos: ${userError.message}`);
      }

      if (!userData || userData.length === 0) {
        throw new Error('Usuario no encontrado en la base de datos. Contacta al administrador.');
      }

      if (userData[0].rol !== 'admin') {
        // Si no es admin, cerrar sesión y mostrar error
        await supabase.auth.signOut();
        throw new Error('Acceso denegado: No eres administrador');
      }

      // Si es admin, redirigir al dashboard de admin
      navigate('/admin/home');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login de Administrador</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@gmail.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="********"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/" className="text-indigo-600 hover:underline">
            Volver al Login de Usuario
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;