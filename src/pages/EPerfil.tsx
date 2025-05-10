import React, { useEffect, useState } from 'react';
import supabase from '../services/supabase';
import { Eye, EyeOff } from 'lucide-react';

const EditarPerfil: React.FC = () => {
  const [userData, setUserData] = useState<{
    id: string;
    email: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    telefono: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    telefono: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Obtener usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setMessage({ text: 'No se pudo obtener el usuario autenticado. Por favor, inicia sesión.', isSuccess: false });
          setLoading(false);
          return;
        }

        // Obtener datos del usuario desde la tabla users
        const { data, error } = await supabase
          .from('users')
          .select('id, email, nombre, apellido_paterno, apellido_materno, telefono')
          .eq('id', user.id)
          .single();

        if (error) throw new Error('Error al cargar los datos del usuario: ' + error.message);

        setUserData(data);
        setFormData({
          nombre: data.nombre,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno || '',
          email: data.email,
          telefono: data.telefono || '',
          password: '',
        });
      } catch (error) {
        setMessage({ text: error.message, isSuccess: false });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validaciones
      if (!formData.nombre || !formData.apellido_paterno) {
        throw new Error('Nombre y apellido paterno son obligatorios.');
      }
      if (formData.password && formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }

      // Obtener usuario autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('No se pudo obtener el usuario autenticado.');
      }

      // Actualizar datos en la tabla users
      const updateData: any = {
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno || null,
        telefono: formData.telefono || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Error al actualizar los datos del usuario: ' + updateError.message);
      }

      // Actualizar contraseña en Supabase Auth si se proporcionó
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: formData.password });
        if (passwordError) {
          throw new Error('Error al actualizar la contraseña: ' + passwordError.message);
        }
      }

      // Actualizar estado local
      setUserData({
        ...userData!,
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno || null,
        telefono: formData.telefono || null,
      });
      setFormData((prev) => ({ ...prev, password: '' }));
      setMessage({ text: 'Perfil actualizado correctamente.', isSuccess: true });
    } catch (error) {
      setMessage({ text: error.message, isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center">No se encontraron datos del usuario.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="p-4 md:p-6 flex-grow max-w-lg mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 text-center">Editar Perfil</h2>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          {message && (
            <div className={`mb-4 p-3 rounded-md ${message.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Paterno *</label>
              <input
                type="text"
                name="apellido_paterno"
                value={formData.apellido_paterno}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Materno</label>
              <input
                type="text"
                name="apellido_materno"
                value={formData.apellido_materno}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  placeholder="Dejar en blanco para no cambiar"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditarPerfil;