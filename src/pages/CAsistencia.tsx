import React, { useEffect, useState, useRef } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const ControlAsistencia: React.FC = () => {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [selectedFiltro, setSelectedFiltro] = useState<'día' | 'semana' | 'mes'>('día');
  const [selectedFecha, setSelectedFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null); // Cambiado de errorMessage a message
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null); // Nuevo estado para tipo de mensaje
  const [manualEscuelaId, setManualEscuelaId] = useState<string>('');
  const [asistenciaData, setAsistenciaData] = useState<any[]>([]);
  const [historialPorAlumno, setHistorialPorAlumno] = useState<any>({});
  const [selectedAlumno, setSelectedAlumno] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const asistenciaRef = useRef<HTMLDivElement>(null);
  const historialRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const escuelaIdFromUrl = new URLSearchParams(location.search).get('escuelaId');
  const escuelaId = escuelaIdFromUrl || manualEscuelaId;

  const userId = '550e8400-e29b-41d4-a716-446655440002'; // Reemplaza con supabase.auth.getUser()

  useEffect(() => {
    const fetchData = async () => {
      if (!escuelaId) {
        setMessage('No se proporcionó un ID de escuela válido. Por favor, verifica la URL o ingresa uno manualmente.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      try {
        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*')
          .eq('escuela_id', escuelaId);

        if (alumnosError) {
          throw new Error('Error al cargar los alumnos: ' + alumnosError.message);
        }
        setAlumnos(alumnosData || []);

        const { data: asistenciasData, error: asistenciasError } = await supabase
          .from('asistencia')
          .select(`
            *,
            alumnos (
              id,
              nombre,
              apellido_paterno,
              apellido_materno,
              numero_matricula,
              grupo
            )
          `);

        if (asistenciasError) {
          throw new Error('Error al cargar las asistencias: ' + asistenciasError.message);
        }
        setAsistencias(asistenciasData || []);

        const savedHistorial = localStorage.getItem('asistenciaHistorial');
        if (savedHistorial) {
          setHistorialPorAlumno(JSON.parse(savedHistorial));
        }
      } catch (error) {
        console.error('Error en fetchData:', error);
        setMessage(error.message || 'Error al cargar los datos');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [escuelaId, navigate]);

  useEffect(() => {
    if (selectedGrupo && selectedFecha) {
      let filteredAsistencias = asistencias.filter((a) => a.alumnos?.grupo === selectedGrupo);

      const fecha = new Date(selectedFecha);
      switch (selectedFiltro) {
        case 'día':
          filteredAsistencias = filteredAsistencias.filter((a) => a.fecha === selectedFecha);
          break;
        case 'semana':
          const startOfWeek = new Date(fecha.setDate(fecha.getDate() - fecha.getDay()));
          const endOfWeek = new Date(fecha.setDate(fecha.getDate() - fecha.getDay() + 6));
          filteredAsistencias = filteredAsistencias.filter((a) => {
            const aDate = new Date(a.fecha);
            return aDate >= startOfWeek && aDate <= endOfWeek;
          });
          break;
        case 'mes':
          filteredAsistencias = filteredAsistencias.filter((a) => {
            const aDate = new Date(a.fecha);
            return aDate.getFullYear() === fecha.getFullYear() && aDate.getMonth() === fecha.getMonth();
          });
          break;
      }

      const alumnosFiltrados = alumnos.filter((a) => a.grupo === selectedGrupo);
      const data = alumnosFiltrados.map((alumno) => {
        const asistencia = filteredAsistencias.find((a) => a.alumno_id === alumno.id) || {
          estado: 'ausente',
          observaciones: '',
        };
        return {
          id: alumno.id,
          nombre: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
          matricula: alumno.numero_matricula || 'N/A',
          estado: asistencia.estado,
          observaciones: asistencia.observaciones || '',
        };
      });
      setAsistenciaData(data);
    } else {
      setAsistenciaData([]);
    }
  }, [selectedGrupo, selectedFecha, selectedFiltro, alumnos, asistencias]);

  const handleSaveAsistencia = async () => {
    if (!selectedGrupo || !selectedFecha || !escuelaId || !userId || !asistenciaData.length) {
      setMessage('No hay datos válidos para guardar. Asegúrate de seleccionar un grupo y fecha.');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage(null);
    setMessageType(null);

    try {
      console.log('Iniciando guardado de asistencia para:', asistenciaData);
      const updates = asistenciaData.map((a: any) => {
        const existingAsistencia = asistencias.find((x) => x.alumno_id === a.id && x.fecha === selectedFecha);
        console.log('Preparando upsert para alumno:', a.id, 'con datos:', {
          id: existingAsistencia?.id,
          alumno_id: a.id,
          fecha: selectedFecha,
          estado: a.estado,
          observaciones: a.observaciones || null,
          creado_por: userId,
        });
        return supabase
          .from('asistencia')
          .upsert(
            {
              id: existingAsistencia?.id,
              alumno_id: a.id,
              fecha: selectedFecha,
              estado: a.estado,
              observaciones: a.observaciones || null,
              creado_por: userId,
            },
            { onConflict: 'alumno_id, fecha' }
          );
      });

      console.log('Ejecutando Promise.all para updates...');
      const results = await Promise.all(updates);
      console.log('Resultados de upsert:', results);

      if (results.every((r) => !r.error)) {
        setEditMode(false);
        const newHistorial = { ...historialPorAlumno };
        asistenciaData.forEach((a: any) => {
          const alumnoId = a.id;
          if (!newHistorial[alumnoId]) {
            newHistorial[alumnoId] = [];
          }
          newHistorial[alumnoId].push({
            nombre: a.nombre,
            matricula: a.matricula,
            fecha: selectedFecha,
            estado: a.estado,
            observaciones: a.observaciones,
            timestamp: new Date().toLocaleString(),
          });
        });
        console.log('Actualizando historial:', newHistorial);
        setHistorialPorAlumno(newHistorial);
        localStorage.setItem('asistenciaHistorial', JSON.stringify(newHistorial));

        const updatedAsistencias = [...asistencias, ...asistenciaData.map((a: any) => {
          const result = results.find((r) => r.data?.[0]?.alumno_id === a.id);
          const existingAsistencia = asistencias.find((x) => x.alumno_id === a.id && x.fecha === selectedFecha);
          return {
            ...a,
            id: result?.data?.[0]?.id || existingAsistencia?.id,
            fecha: selectedFecha,
            creado_por: userId,
          };
        })];
        console.log('Actualizando asistencias:', updatedAsistencias);
        setAsistencias(updatedAsistencias);

        setMessage('Asistencia guardada correctamente');
        setMessageType('success');
      } else {
        const errorDetails = results.find((r) => r.error)?.error;
        console.error('Errores en upsert:', errorDetails);
        throw new Error('Error al guardar la asistencia: ' + (errorDetails?.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSaveAsistencia:', error);
      setMessage(error.message || 'Error inesperado al guardar la asistencia');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const exportToPDF = async () => {
    if (!asistenciaRef.current || !selectedGrupo || !selectedFecha) return;

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const primaryColor = '#1E3A8A';
      const secondaryColor = '#4B5563';
      const accentColor = '#E5E7EB';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(20);
      doc.setTextColor(primaryColor);
      doc.text('Reporte de Asistencia', 20, 20);

      doc.setFontSize(12);
      doc.setTextColor(secondaryColor);
      doc.text(`Grupo: ${selectedGrupo}`, 20, 30);
      doc.text(`Filtro: ${selectedFiltro}`, 20, 36);
      doc.text(`Fecha: ${selectedFecha}`, 20, 42);

      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.line(20, 48, 190, 48);

      doc.autoTable({
        startY: 54,
        head: [['Nombre', 'Matrícula', 'Estado', 'Observaciones']],
        body: asistenciaData.map((a: any) => [a.nombre, a.matricula, a.estado, a.observaciones || '-']),
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 10, textColor: secondaryColor, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: primaryColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: accentColor },
        margin: { left: 20, right: 20 },
      });

      const canvas = await html2canvas(asistenciaRef.current);
      const imgData = canvas.toDataURL('image/png');
      doc.addPage();
      doc.addImage(imgData, 'PNG', 10, 10, 190, 277);

      doc.save(`asistencia_${selectedGrupo}_${selectedFiltro}_${selectedFecha}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setMessage('Error al generar el reporte PDF: ' + (error.message || 'Error desconocido'));
      setMessageType('error');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  const grupos = [...new Set(alumnos.map((a) => a.grupo))];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Control de Asistencia</h2>
        <div className="bg-white rounded-xl shadow-lg p-6">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          {!escuelaIdFromUrl && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ingresa un ID de escuela (UUID):</label>
              <input
                type="text"
                value={manualEscuelaId}
                onChange={(e) => setManualEscuelaId(e.target.value)}
                placeholder="Ejemplo: 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Grupo:</label>
              <select
                value={selectedGrupo}
                onChange={(e) => {
                  console.log('Selecting group:', e.target.value);
                  setSelectedGrupo(e.target.value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un grupo</option>
                {grupos.map((grupo) => (
                  <option key={grupo} value={grupo}>{grupo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtro:</label>
              <select
                value={selectedFiltro}
                onChange={(e) => setSelectedFiltro(e.target.value as 'día' | 'semana' | 'mes')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="día">Día</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha:</label>
              <input
                type="date"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {selectedGrupo && selectedFecha && asistenciaData.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Registro de Asistencia</h3>
              <button
                onClick={() => setEditMode(!editMode)}
                className="mb-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
              >
                {editMode ? 'Desactivar Edición' : 'Activar Edición'}
              </button>
              <div ref={asistenciaRef} className="p-6 bg-gray-50 rounded-lg shadow-md mb-6">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-blue-100 text-gray-700">
                      <th className="py-3 px-4 text-left font-semibold">Nombre</th>
                      <th className="py-3 px-4 text-left font-semibold">Matrícula</th>
                      <th className="py-3 px-4 text-left font-semibold">Estado</th>
                      <th className="py-3 px-4 text-left font-semibold">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(asistenciaData) && asistenciaData.map((a: any) => (
                      <tr key={a.id} className="border-b hover:bg-gray-100">
                        <td className="py-3 px-4">{a.nombre}</td>
                        <td className="py-3 px-4">{a.matricula}</td>
                        <td className="py-3 px-4">
                          {editMode ? (
                            <select
                              value={a.estado}
                              onChange={(e) =>
                                setAsistenciaData((prev: any[]) =>
                                  prev.map((p: any) => (p.id === a.id ? { ...p, estado: e.target.value } : p))
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded-md"
                            >
                              <option value="ausente">Ausente</option>
                              <option value="presente">Presente</option>
                              <option value="retrasado">Retrasado</option>
                            </select>
                          ) : a.estado}
                        </td>
                        <td className="py-3 px-4">
                          {editMode ? (
                            <input
                              type="text"
                              value={a.observaciones || ''}
                              onChange={(e) =>
                                setAsistenciaData((prev: any[]) =>
                                  prev.map((p: any) => (p.id === a.id ? { ...p, observaciones: e.target.value } : p))
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded-md"
                            />
                          ) : a.observaciones || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editMode && (
                <button
                  onClick={handleSaveAsistencia}
                  disabled={saving}
                  className={`bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition duration-300 shadow-md ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Guardando...' : 'Guardar Asistencia'}
                </button>
              )}

              <button
                onClick={exportToPDF}
                className="ml-4 bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
              >
                Generar Reporte de Asistencia
              </button>
            </div>
          )}

          {/* Historial de Asistencia por Alumno */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Historial de Asistencia por Alumno</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Alumno:</label>
              <select
                value={selectedAlumno}
                onChange={(e) => setSelectedAlumno(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un alumno</option>
                {alumnos
                  .filter((a) => a.grupo === selectedGrupo)
                  .map((alumno) => (
                    <option key={alumno.id} value={alumno.id}>
                      {`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''} (${alumno.numero_matricula || 'N/A'})`}
                    </option>
                  ))}
              </select>
            </div>
            <div ref={historialRef} className="p-6 bg-gray-50 rounded-lg shadow-md">
              {selectedAlumno && historialPorAlumno[selectedAlumno] && historialPorAlumno[selectedAlumno].length > 0 ? (
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-blue-100 text-gray-700">
                      <th className="py-3 px-4 text-left font-semibold">Fecha</th>
                      <th className="py-3 px-4 text-left font-semibold">Estado</th>
                      <th className="py-3 px-4 text-left font-semibold">Observaciones</th>
                      <th className="py-3 px-4 text-left font-semibold">Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialPorAlumno[selectedAlumno].map((h: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-100">
                        <td className="py-3 px-4">{h.fecha}</td>
                        <td className="py-3 px-4">{h.estado}</td>
                        <td className="py-3 px-4">{h.observaciones || '-'}</td>
                        <td className="py-3 px-4">{h.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">Selecciona un alumno para ver su historial o no hay registros disponibles.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlAsistencia;