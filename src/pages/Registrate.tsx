import React, { useState, useEffect } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import eye icons from react-icons

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get('code') || '';

  useEffect(() => {
    console.log('Código recibido en Register:', code); // Depuración
    if (!code) {
      setError('No se proporcionó un código de verificación válido. Por favor, verifica primero.');
    }
  }, [code]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!code) {
        throw new Error('No se proporcionó un código de verificación válido. Por favor, verifica primero.');
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const user = data.user;
      if (!user) {
        throw new Error('No se pudo crear el usuario');
      }

      const { data: codeData, error: codeError } = await supabase
        .from('codigos')
        .select('id')
        .eq('codigo', code)
        .single();

      if (codeError || !codeData) {
        throw new Error('Error al asociar el código al usuario');
      }

      const { error: userError } = await supabase.from('users').insert({
        id: user.id,
        email,
        password, // Nota: Debes hashear la contraseña si la guardas aquí
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        telefono,
        rol: 'profesor',
        codigo_registro: codeData.id,
      });

      if (userError) {
        throw new Error(userError.message);
      }

      await supabase
        .from('codigos')
        .update({ usado: true, used_by: user.id })
        .eq('id', codeData.id);

      navigate('/crearE');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Registro de Profesor - EduConnect</h2>
        <form onSubmit={handleRegister} className="space-y-4">
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
              type={showPassword ? 'text' : 'password'} // Toggle between text and password
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="********"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
            >
              {showPassword ? (
                <FaEyeSlash className="h-5 w-5 text-gray-500" />
              ) : (
                <FaEye className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              type="text"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="apellidoPaterno" className="block text-sm font-medium text-gray-700">
              Apellido Paterno
            </label>
            <input
              type="text"
              id="apellidoPaterno"
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="apellidoMaterno" className="block text-sm font-medium text-gray-700">
              Apellido Materno
            </label>
            <input
              type="text"
              id="apellidoMaterno"
              value={apellidoMaterno}
              onChange={(e) => setApellidoMaterno(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              type="text"
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;