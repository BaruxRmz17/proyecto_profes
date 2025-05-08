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

interface User {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  rol: string;
  is_active: boolean;
  created_at: string;
}

const Usuarios: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
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

        await fetchUsers();
        setLoading(false);
      } catch (error) {
        console.error('Error checking user:', error);
        navigate('/admin/login');
      }
    };

    checkUser();
  }, [navigate]);

  // Obtener usuarios y preparar datos para la gráfica
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('rol', 'profesor') // Filtrar solo profesores
        .order('nombre', { ascending: true });
      if (error) throw error;

      setUsers(data || []);
      setFilteredUsers(data || []);
      prepareChartData(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Filtrar usuarios por estado de actividad
  useEffect(() => {
    if (selectedFilter === 'todos') {
      setFilteredUsers(users);
      prepareChartData(users);
    } else {
      const filtered = users.filter((user) =>
        selectedFilter === 'activos' ? user.is_active : !user.is_active
      );
      setFilteredUsers(filtered);
      prepareChartData(users); // Mostrar totales en la gráfica independientemente del filtro
    }
  }, [selectedFilter, users]);

  // Preparar datos para la gráfica (activos vs inactivos)
  const prepareChartData = (usersData: User[]) => {
    const activosCount = usersData.filter((user) => user.is_active).length;
    const inactivosCount = usersData.filter((user) => !user.is_active).length;

    const data = {
      labels: ['Activos', 'Inactivos'],
      datasets: [
        {
          label: 'Cantidad de Usuarios',
          data: [activosCount, inactivosCount],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)', // Teal para activos
            'rgba(255, 99, 132, 0.6)', // Rosa para inactivos
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)', // Teal con opacidad 1
            'rgba(255, 99, 132, 1)', // Rosa con opacidad 1
          ],
          borderWidth: 1,
        },
      ],
    };

    setChartData(data);
  };

  // Mostrar modal de confirmación para eliminar
  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setShowModal(true);
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userToDelete);
        if (error) throw error;
        await fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
    setShowModal(false);
    setUserToDelete(null);
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setShowModal(false);
    setUserToDelete(null);
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
          Gestión de Usuarios
        </h1>
      </header>

      {/* Filtro por estado de actividad */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Filtrar por Estado de Actividad
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
            <option value="todos">Todos los usuarios</option>
            <option value="activos">Usuarios activos</option>
            <option value="inactivos">Usuarios inactivos</option>
          </select>
        </div>
      </section>

      {/* Gráfica de usuarios activos vs inactivos */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Distribución de Usuarios
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
                  title: { display: true, text: 'Usuarios Activos vs Inactivos' },
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

      {/* Lista de usuarios */}
      <section className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Usuarios Registrados
        </h2>
        {filteredUsers.length === 0 ? (
          <p className="text-gray-600">No hay usuarios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
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
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.nombre} {user.apellido_paterno} {user.apellido_materno || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.rol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteClick(user.id)}
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
              ¿Estás seguro de que deseas eliminar este usuario? Esta acción no
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

export default Usuarios;