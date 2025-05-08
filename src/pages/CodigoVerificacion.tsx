import React, { useState } from 'react';
import supabase  from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const VerifyCode: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: codeError } = await supabase
        .from('codigos')
        .select('id, usado, codigo')
        .eq('codigo', code)
        .single();

      if (codeError || !data) {
        throw new Error('Código no válido');
      }

      if (data.usado) {
        throw new Error('Código ya utilizado');
      }

      // Si el código es válido, redirigir al formulario de registro con el código en la URL
      navigate(`/registrate?code=${code}`);
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Ingresar Código de Verificación</h2>
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Código de Verificación
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ingresa tu código"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Verificar Código'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyCode;