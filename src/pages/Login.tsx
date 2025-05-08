import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react'; // Importar los iconos de ojo de Lucid
import supabase from '../services/supabase';
import { Link, useNavigate } from 'react-router-dom';

const UserLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const user = data.user;
      if (!user) {
        throw new Error('No se pudo obtener el usuario');
      }

      // Verificar el rol del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw new Error(userError.message);
      }

      if (userData.rol !== 'profesor') {
        await supabase.auth.signOut();
        throw new Error('Acceso denegado: Solo los profesores pueden iniciar sesión aquí');
      }

      // Redirigir al dashboard del usuario
      navigate('/crearE');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login de Usuario "EduConnect"</h2>
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
              placeholder="profesor@ejemplo.com"
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'} // Mostrar/ocultar la contraseña
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="********"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-500" />
              ) : (
                <Eye className="w-5 h-5 text-gray-500" />
              )}
            </button>
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
        <div className="mt-4 flex justify-between">
          <Link to="/verificar-codigo" className="text-indigo-600 hover:underline">
            Regístrate
          </Link>
          <Link to="/admin/login" className="text-indigo-600 hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
