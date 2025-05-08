import React, { useEffect, useState } from 'react';
import supabase from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar los componentes necesarios para Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Codigo {
  id: string;
  codigo: string;
  nombre?: string;
  usado: boolean;
  created_at: string;
  created_by: string;
  used_by?: string;
}

const Codigos: React.FC = () => {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [filteredCodigos, setFilteredCodigos] = useState<Codigo[]>([]);
  const [newCodigo, setNewCodigo] = useState({ nombre: '' });
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [codigoToDelete, setCodigoToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const navigate = useNavigate();

  // Verificar autenticación y rol
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/admin/login');
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('rol')
          .eq('id', user.id)
          .single();

        if (error || !userData || userData.rol !== 'admin') {
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }

        await fetchCodigos();
        setLoading(false);
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/admin/login');
      }
    };

    checkUser();
  }, [navigate]);

  // Obtener códigos y preparar datos para la gráfica
  const fetchCodigos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user authenticated');

      const { data, error } = await supabase
        .from('codigos')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      setCodigos(data || []);
      setFilteredCodigos(data || []);
      prepareChartData(data || []);
    } catch (error) {
      console.error('Error fetching codigos:', error);
    }
  };

  // Filtrar códigos por estado de uso
  useEffect(() => {
    if (selectedFilter === 'todos') {
      setFilteredCodigos(codigos);
      prepareChartData(codigos);
    } else {
      const filtered = codigos.filter((codigo) =>
        selectedFilter === 'usados' ? codigo.usado : !codigo.usado
      );
      setFilteredCodigos(filtered);
      prepareChartData(codigos); // Mostrar totales en la gráfica independientemente del filtro
    }
  }, [selectedFilter, codigos]);

  // Preparar datos para la gráfica (usados vs no usados)
  const prepareChartData = (codigosData: Codigo[]) => {
    const usadosCount = codigosData.filter((codigo) => codigo.usado).length;
    const noUsadosCount = codigosData.filter((codigo) => !codigo.usado).length;

    const data = {
      labels: ['Usados', 'No Usados'],
      datasets: [
        {
          label: 'Cantidad de Códigos',
          data: [usadosCount, noUsadosCount],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)', // Rosa para usados
            'rgba(75, 192, 192, 0.6)', // Teal para no usados
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)', // Rosa con opacidad 1
            'rgba(75, 192, 192, 1)', // Teal con opacidad 1
          ],
          borderWidth: 1,
        },
      ],
    };

    setChartData(data);
  };

  // Generar código único de 4 dígitos
  const generateUniqueCode = async (): Promise<string> => {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const { data, error } = await supabase
        .from('codigos')
        .select('codigo')
        .eq('codigo', code);
      if (error) throw error;
      isUnique = !data || data.length === 0;
    }
    return code;
  };

  // Crear código
  const handleCrearCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const codigo = await generateUniqueCode();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user authenticated');

      const { error } = await supabase
        .from('codigos')
        .insert({
          codigo,
          nombre: newCodigo.nombre || null,
          created_by: user.id,
          usado: false,
        });
      if (error) throw error;

      setNewCodigo({ nombre: '' });
      await fetchCodigos();
    } catch (error) {
      console.error('Error creating codigo:', error);
    }
  };

  // Mostrar modal de confirmación para eliminar
  const handleDeleteClick = (id: string) => {
    setCodigoToDelete(id);
    setShowModal(true);
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (codigoToDelete) {
      try {
        const { error } = await supabase
          .from('codigos')
          .delete()
          .eq('id', codigoToDelete);
        if (error) throw error;
        await fetchCodigos();
      } catch (error) {
        console.error('Error deleting codigo:', error);
      }
    }
    setShowModal(false);
    setCodigoToDelete(null);
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setShowModal(false);
    setCodigoToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Título */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Gestión de Códigos
        </h1>
      </header>

      {/* Formulario para crear código */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generar Nuevo Código
        </h2>
        <form
          onSubmit={handleCrearCodigo}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre (Opcional)
            </label>
            <input
              type="text"
              placeholder="Nombre del código"
              value={newCodigo.nombre}
              onChange={(e) =>
                setNewCodigo({ ...newCodigo, nombre: e.target.value })
              }
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Generar Código
            </button>
          </div>
        </form>
      </section>

      {/* Filtro por estado de uso */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Filtrar por Estado de Uso
        </h2>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seleccionar Estado
          </label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los códigos</option>
            <option value="usados">Códigos usados</option>
            <option value="no_usados">Códigos no usados</option>
          </select>
        </div>
      </section>

      {/* Gráfica de códigos usados vs no usados */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribución de Códigos
        </h2>
        {chartData && chartData.labels.length > 0 ? (
          <div className="h-64">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Códigos Usados vs No Usados' },
                },
                scales: {
                  x: { title: { display: true, text: 'Estado' } },
                  y: { title: { display: true, text: 'Cantidad' } },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-gray-600">No hay datos para mostrar.</p>
        )}
      </section>

      {/* Lista de códigos */}
      <section className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Códigos Registrados
        </h2>
        {filteredCodigos.length === 0 ? (
          <p className="text-gray-600">No hay códigos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCodigos.map((codigo) => (
                  <tr key={codigo.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {codigo.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {codigo.nombre || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {codigo.usado ? 'Usado' : 'No usado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteClick(codigo.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de confirmación para eliminar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este código? Esta acción no
              se puede deshacer.
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

export default Codigos;