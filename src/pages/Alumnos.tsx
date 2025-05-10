import React, { useEffect, useState } from 'react';
import supabase from '../services/supabase';
import { useNavigate } from 'react-router-dom';

interface Alumno {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  numero_matricula: string | null;
  grupo: string | null;
  escuela_id: string;
  nombre_padre: string | null;
  nombre_madre: string | null;
  telefono: string | null;
}

interface Escuela {
  id: string;
  nombre: string;
}

const Alumnos: React.FC = () => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [newAlumno, setNewAlumno] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    numero_matricula: '',
    grupo: '',
    escuela_id: '',
    nombre_padre: '',
    nombre_madre: '',
    telefono: '',
  });
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alumnoToDelete, setAlumnoToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Verificar autenticación, rol y cargar datos
  useEffect(() => {
    const checkUserAndFetchData = async () => {
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
          .select('escuelas(id, nombre)')
          .eq('user_id', user.id);

        if (escuelasError) throw new Error('Error al cargar escuelas');

        const escuelasList = escuelasData?.map((item) => item.escuelas) || [];
        setEscuelas(escuelasList);

        // Fetch alumnos de las escuelas asociadas
        const escuelaIds = escuelasList.map((escuela) => escuela.id);
        if (escuelaIds.length > 0) {
          const { data: alumnosData, error: alumnosError } = await supabase
            .from('alumnos')
            .select('*')
            .in('escuela_id', escuelaIds)
            .order('nombre', { ascending: true });

          if (alumnosError) throw new Error('Error al cargar alumnos');
          setAlumnos(alumnosData || []);
        }
      } catch (err: any) {
        setError(err.message || 'Error inesperado al cargar los datos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [navigate]);

  const handleCreateAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { data, error } = await supabase
        .from('alumnos')
        .insert({
          nombre: newAlumno.nombre,
          apellido_paterno: newAlumno.apellido_paterno,
          apellido_materno: newAlumno.apellido_materno || null,
          numero_matricula: newAlumno.numero_matricula || null,
          grupo: newAlumno.grupo || null,
          escuela_id: newAlumno.escuela_id,
          nombre_padre: newAlumno.nombre_padre || null,
          nombre_madre: newAlumno.nombre_madre || null,
          telefono: newAlumno.telefono || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Agregar el nuevo alumno a la lista
      setAlumnos((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewAlumno({
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        numero_matricula: '',
        grupo: '',
        escuela_id: '',
        nombre_padre: '',
        nombre_madre: '',
        telefono: '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al crear el alumno');
    }
  };

  const handleEditAlumno = async (alumno: Alumno) => {
    setError(null);

    try {
      const { error } = await supabase
        .from('alumnos')
        .update({
          nombre: alumno.nombre,
          apellido_paterno: alumno.apellido_paterno,
          apellido_materno: alumno.apellido_materno || null,
          numero_matricula: alumno.numero_matricula || null,
          grupo: alumno.grupo || null,
          escuela_id: alumno.escuela_id,
          nombre_padre: alumno.nombre_padre || null,
          nombre_madre: alumno.nombre_madre || null,
          telefono: alumno.telefono || null,
        })
        .eq('id', alumno.id);

      if (error) throw new Error(error.message);

      setAlumnos((prev) =>
        prev
          .map((a) => (a.id === alumno.id ? alumno : a))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setEditingAlumno(null);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el alumno');
    }
  };

  const handleDeleteClick = (alumnoId: string) => {
    setAlumnoToDelete(alumnoId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!alumnoToDelete) return;

    try {
      const { error } = await supabase
        .from('alumnos')
        .delete()
        .eq('id', alumnoToDelete);

      if (error) throw new Error(error.message);

      setAlumnos((prev) => prev.filter((alumno) => alumno.id !== alumnoToDelete));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el alumno');
    } finally {
      setShowDeleteModal(false);
      setAlumnoToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setAlumnoToDelete(null);
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
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
        Gestionar Alumnos
      </h1>

      {/* Formulario para crear alumno */}
      <section className="mb-12 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Agregar Nuevo Alumno
        </h2>
        <form
          onSubmit={handleCreateAlumno}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={newAlumno.nombre}
              onChange={(e) => setNewAlumno({ ...newAlumno, nombre: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido Paterno
            </label>
            <input
              type="text"
              value={newAlumno.apellido_paterno}
              onChange={(e) => setNewAlumno({ ...newAlumno, apellido_paterno: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido Materno
            </label>
            <input
              type="text"
              value={newAlumno.apellido_materno}
              onChange={(e) => setNewAlumno({ ...newAlumno, apellido_materno: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Matrícula
            </label>
            <input
              type="text"
              value={newAlumno.numero_matricula}
              onChange={(e) => setNewAlumno({ ...newAlumno, numero_matricula: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grupo
            </label>
            <input
              type="text"
              value={newAlumno.grupo}
              onChange={(e) => setNewAlumno({ ...newAlumno, grupo: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escuela
            </label>
            <select
              value={newAlumno.escuela_id}
              onChange={(e) => setNewAlumno({ ...newAlumno, escuela_id: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>Selecciona una escuela</option>
              {escuelas.map((escuela) => (
                <option key={escuela.id} value={escuela.id}>
                  {escuela.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Padre
            </label>
            <input
              type="text"
              value={newAlumno.nombre_padre}
              onChange={(e) => setNewAlumno({ ...newAlumno, nombre_padre: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Madre
            </label>
            <input
              type="text"
              value={newAlumno.nombre_madre}
              onChange={(e) => setNewAlumno({ ...newAlumno, nombre_madre: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              value={newAlumno.telefono}
              onChange={(e) => setNewAlumno({ ...newAlumno, telefono: e.target.value })}
              className="border border-gray-300 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar Alumno
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
      </section>

      {/* Tabla de alumnos */}
      <section className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Alumnos Registrados
        </h2>
        {alumnos.length === 0 ? (
          <p className="text-gray-600">No hay alumnos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apellido Paterno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apellido Materno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matrícula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grupo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Escuela
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Padre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Madre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alumnos.map((alumno) => (
                  <tr key={alumno.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.nombre}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, nombre: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.nombre
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.apellido_paterno}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, apellido_paterno: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.apellido_paterno
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.apellido_materno || ''}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, apellido_materno: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.apellido_materno || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.numero_matricula || ''}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, numero_matricula: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.numero_matricula || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.grupo || ''}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, grupo: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.grupo || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <select
                          value={editingAlumno.escuela_id}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, escuela_id: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        >
                          {escuelas.map((escuela) => (
                            <option key={escuela.id} value={escuela.id}>
                              {escuela.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        escuelas.find((e) => e.id === alumno.escuela_id)?.nombre || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.nombre_padre || ''}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, nombre_padre: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.nombre_padre || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.nombre_madre || ''}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, nombre_madre: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.nombre_madre || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingAlumno?.id === alumno.id ? (
                        <input
                          type="text"
                          value={editingAlumno.telefono || ''}
                          onChange={(e) =>
                            setEditingAlumno({ ...editingAlumno, telefono: e.target.value })
                          }
                          className="border border-gray-300 px-2 py-1 rounded w-full"
                        />
                      ) : (
                        alumno.telefono || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingAlumno?.id === alumno.id ? (
                        <>
                          <button
                            onClick={() => handleEditAlumno(editingAlumno)}
                            className="text-green-600 hover:text-green-800 mr-4"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingAlumno(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingAlumno(alumno)}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClick(alumno.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar este alumno? Esta acción no se puede deshacer.
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

export default Alumnos;