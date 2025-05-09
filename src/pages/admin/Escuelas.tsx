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

interface Escuela {
  id: string;
  nombre: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

const Escuelas: React.FC = () => {
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [filteredEscuelas, setFilteredEscuelas] = useState<Escuela[]>([]);
  const [newEscuela, setNewEscuela] = useState({ nombre: '', estado: '' });
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [estados, setEstados] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [escuelaToDelete, setEscuelaToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const navigate = useNavigate();

  // Lista de los 32 estados de México
  const estadosMexico = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 
    'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 
    'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

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

        await fetchEscuelas();
        setLoading(false);
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/admin/login');
      }
    };

    checkUser();
  }, [navigate]);

  // Obtener escuelas y preparar datos
  const fetchEscuelas = async () => {
    try {
      const { data, error } = await supabase
        .from('escuelas')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;

      setEscuelas(data || []);
      setFilteredEscuelas(data || []);

      // Extraer estados únicos para el filtro
      const uniqueEstados = [...new Set(data?.map((escuela) => escuela.estado))].sort();
      setEstados(uniqueEstados);

      prepareChartData(data || []);
    } catch (error) {
      console.error('Error fetching escuelas:', error);
    }
  };

  // Filtrar escuelas por estado
  useEffect(() => {
    if (selectedEstado === 'todos') {
      setFilteredEscuelas(escuelas);
      prepareChartData(escuelas);
    } else {
      const filtered = escuelas.filter(
        (escuela) => escuela.estado === selectedEstado
      );
      setFilteredEscuelas(filtered);
      prepareChartData(filtered);
    }
  }, [selectedEstado, escuelas]);

  // Preparar datos para la gráfica (escuelas por estado)
  const prepareChartData = (escuelasData: Escuela[]) => {
    // Agrupar escuelas por estado
    const estadoCount = escuelasData.reduce((acc: Record<string, number>, escuela) => {
      acc[escuela.estado] = (acc[escuela.estado] || 0) + 1;
      return acc;
    }, {});

    // Ordenar estados por cantidad de escuelas (descendente)
    const sortedEstados = Object.keys(estadoCount).sort(
      (a, b) => estadoCount[b] - estadoCount[a]
    );

    // Paleta de colores para las barras
    const colors = [
      'rgba(75, 192, 192, 0.6)', // Teal
      'rgba(255, 99, 132, 0.6)', // Rosa
      'rgba(54, 162, 235, 0.6)', // Azul
      'rgba(255, 206, 86, 0.6)', // Amarillo
      'rgba(153, 102, 255, 0.6)', // Púrpura
      'rgba(255, 159, 64, 0.6)', // Naranja
      'rgba(199, 199, 199, 0.6)', // Gris
      'rgba(83, 102, 255, 0.6)', // Índigo
    ];

    // Asignar colores a cada barra
    const backgroundColors = sortedEstados.map((_, index) => {
      return colors[index % colors.length]; // Ciclar colores si hay más estados que colores
    });

    const borderColors = backgroundColors.map((color) =>
      color.replace('0.6', '1') // Aumentar opacidad para el borde
    );

    // Datos para Chart.js
    const data = {
      labels: sortedEstados,
      datasets: [
        {
          label: 'Número de Escuelas',
          data: sortedEstados.map((estado) => estadoCount[estado]),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };

    setChartData(data);
  };

  // Crear escuela
  const handleCrearEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('escuelas')
        .insert({ nombre: newEscuela.nombre, estado: newEscuela.estado });
      if (error) throw error;
      setNewEscuela({ nombre: '', estado: '' });
      await fetchEscuelas();
    } catch (error) {
      console.error('Error creating escuela:', error);
    }
  };

  // Mostrar modal de confirmación para eliminar
  const handleDeleteClick = (id: string) => {
    setEscuelaToDelete(id);
    setShowModal(true);
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (escuelaToDelete) {
      try {
        const { error } = await supabase
          .from('escuelas')
          .delete()
          .eq('id', escuelaToDelete);
        if (error) throw error;
        await fetchEscuelas();
      } catch (error) {
        console.error('Error deleting escuela:', error);
      }
    }
    setShowModal(false);
    setEscuelaToDelete(null);
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setShowModal(false);
    setEscuelaToDelete(null);
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
          Gestión de Escuelas
        </h1>
      </header>

      {/* Formulario para crear escuela */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Agregar Nueva Escuela
        </h2>
        <form
          onSubmit={handleCrearEscuela}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              placeholder="Nombre de la escuela"
              value={newEscuela.nombre}
              onChange={(e) =>
                setNewEscuela({ ...newEscuela, nombre: e.target.value })
              }
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={newEscuela.estado}
              onChange={(e) =>
                setNewEscuela({ ...newEscuela, estado: e.target.value })
              }
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>Selecciona un estado</option>
              {estadosMexico.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar Escuela
            </button>
          </div>
        </form>
      </section>

      {/* Filtro por estado */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Filtrar por Estado
        </h2>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seleccionar Estado
          </label>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Gráfica de escuelas por estado */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Escuelas por Estado
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
                  title: { display: true, text: 'Distribución de Escuelas por Estado' },
                },
                scales: {
                  x: { title: { display: true, text: 'Estado' } },
                  y: { title: { display: true, text: 'Número de Escuelas' } },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-gray-600">No hay datos para mostrar.</p>
        )}
      </section>

      {/* Lista de escuelas */}
      <section className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Escuelas Registradas
        </h2>
        {filteredEscuelas.length === 0 ? (
          <p className="text-gray-600">No hay escuelas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                {filteredEscuelas.map((escuela) => (
                  <tr key={escuela.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {escuela.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {escuela.estado}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteClick(escuela.id)}
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
              ¿Estás seguro de que deseas eliminar esta escuela? Esta acción no
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

export default Escuelas;