import React, { useEffect, useState, useRef } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Comportamiento: React.FC = () => {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [comportamientos, setComportamientos] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [selectedFecha, setSelectedFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [manualEscuelaId, setManualEscuelaId] = useState<string>('');
  const [alertas, setAlertas] = useState<{ alumnoId: string; mensaje: string; tipo: 'warning' | 'danger' }[]>([]);
  const [comportamientoInputs, setComportamientoInputs] = useState<{ [key: string]: { categoria: string; descripcion: string } }>({});

  const comportamientoChartRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const escuelaIdFromUrl = new URLSearchParams(location.search).get('escuelaId');
  const escuelaId = escuelaIdFromUrl || manualEscuelaId;

  const getUserId = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      setMessage({ text: 'No se pudo obtener el usuario autenticado. Por favor, inicia sesión.', isSuccess: false });
      return null;
    }
    return user.id;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!escuelaId) {
        setMessage({ text: 'No se proporcionó un ID de escuela válido. Por favor, verifica la URL o ingresa uno manualmente.', isSuccess: false });
        setLoading(false);
        return;
      }

      try {
        const [{ data: alumnosData, error: alumnosError }, { data: comportamientosData, error: comportamientosError }] = await Promise.all([
          supabase.from('alumnos').select('*').eq('escuela_id', escuelaId),
          supabase
            .from('comportamiento')
            .select(`
              *,
              alumnos (
                id,
                nombre,
                apellido_paterno,
                apellido_materno,
                grupo,
                escuela_id
              )
            `)
            .eq('alumnos.escuela_id', escuelaId),
        ]);

        if (alumnosError) throw new Error('Error al cargar los alumnos: ' + alumnosError.message);
        setAlumnos(alumnosData || []);

        if (comportamientosError) throw new Error('Error al cargar los comportamientos: ' + comportamientosError.message);
        setComportamientos(comportamientosData || []);

      } catch (error) {
        setMessage({ text: error.message, isSuccess: false });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [escuelaId, navigate]);

  useEffect(() => {
    if (selectedGrupo && selectedFecha) {
      const newAlertas: { alumnoId: string; mensaje: string; tipo: 'warning' | 'danger' }[] = [];
      const alumnosFiltrados = alumnos.filter((a) => a.grupo === selectedGrupo);

      alumnosFiltrados.forEach((alumno) => {
        const comportamientosAlumno = comportamientos.filter(
          (c) => c.alumno_id === alumno.id && c.fecha === selectedFecha
        );

        // Contar registros de Regular Actitud y Mala Actitud
        const regularCount = comportamientosAlumno.filter((c) => c.categoria === 'Regular Actitud').length;
        const malaCount = comportamientosAlumno.filter((c) => c.categoria === 'Mala Actitud').length;
        const hasMalPortado = comportamientosAlumno.some((c) => c.descripcion?.toLowerCase() === 'mal portado');

        // Alerta por 3 Regular Actitud (equivalente a 1 Mala Actitud)
        if (regularCount >= 3) {
          newAlertas.push({
            alumnoId: alumno.id,
            mensaje: `${alumno.nombre} ${alumno.apellido_paterno} ha acumulado 3 Regular Actitud. Se registra como Mala Actitud.`,
            tipo: 'warning',
          });
        }

        // Alerta por 3 Mala Actitud o "Mal portado"
        if (malaCount >= 3 || hasMalPortado) {
          newAlertas.push({
            alumnoId: alumno.id,
            mensaje: `Llamar a los padres de ${alumno.nombre} ${alumno.apellido_paterno} debido a ${malaCount >= 3 ? '3 sanciones de Mala Actitud' : '"Mal portado" en descripción'}.`,
            tipo: 'danger',
          });
        }
      });

      setAlertas(newAlertas);
    }
  }, [selectedGrupo, selectedFecha, alumnos, comportamientos]);

  const handleSaveComportamiento = async () => {
    if (!selectedGrupo || !selectedFecha || !escuelaId) {
      setMessage({ text: 'Selecciona grupo y fecha antes de guardar.', isSuccess: false });
      return;
    }

    const userId = await getUserId();
    if (!userId) return;

    setLoading(true);
    try {
      const updates = Object.entries(comportamientoInputs).map(async ([alumnoId, { categoria, descripcion }]) => {
        if (!categoria) return null; // Saltar si no se seleccionó categoría

        // Verificar si hay 3 Regular Actitud para convertir a Mala Actitud
        const comportamientosAlumno = comportamientos.filter(
          (c) => c.alumno_id === alumnoId && c.fecha === selectedFecha && c.categoria === 'Regular Actitud'
        );
        const regularCount = comportamientosAlumno.length + (categoria === 'Regular Actitud' ? 1 : 0);

        let finalCategoria = categoria;
        if (regularCount >= 3 && categoria === 'Regular Actitud') {
          finalCategoria = 'Mala Actitud';
        }

        return supabase.from('comportamiento').insert({
          alumno_id: alumnoId,
          fecha: selectedFecha,
          categoria: finalCategoria,
          descripcion,
          creado_por: userId,
          created_at: new Date().toISOString(),
        });
      });

      const results = await Promise.all(updates.filter((u) => u !== null));
      if (results.every((r) => !r.error)) {
        // Recargar comportamientos desde Supabase
        const { data: updatedComportamientos, error: comportamientosError } = await supabase
          .from('comportamiento')
          .select(`
            *,
            alumnos (
              id,
              nombre,
              apellido_paterno,
              apellido_materno,
              grupo,
              escuela_id
            )
          `)
          .eq('alumnos.escuela_id', escuelaId);

        if (comportamientosError) throw new Error('Error al recargar comportamientos: ' + comportamientosError.message);
        setComportamientos(updatedComportamientos || []);
        setEditMode(false);
        setComportamientoInputs({});
        setMessage({ text: 'Comportamiento guardado correctamente.', isSuccess: true });
      } else {
        throw new Error('Error al guardar el comportamiento: ' + results.find((r) => r.error)?.error?.message);
      }
    } catch (error) {
      setMessage({ text: error.message, isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (alumnoId: string, field: 'categoria' | 'descripcion', value: string) => {
    setComportamientoInputs((prev) => ({
      ...prev,
      [alumnoId]: {
        ...prev[alumnoId] || { categoria: '', descripcion: '' },
        [field]: value,
      },
    }));
  };

  const prepareComportamientoData = () => {
    const alumnosFiltrados = alumnos.filter((a) => a.grupo === selectedGrupo);
    const counts = {
      'Buena Actitud': 0,
      'Regular Actitud': 0,
      'Mala Actitud': 0,
    };

    alumnosFiltrados.forEach((alumno) => {
      const comportamientosAlumno = comportamientos.filter(
        (c) => c.alumno_id === alumno.id && c.fecha === selectedFecha
      );
      if (comportamientosAlumno.length > 0) {
        const categoria = comportamientosAlumno[0].categoria; // Tomar la primera categoría del día
        if (counts[categoria] !== undefined) {
          counts[categoria]++;
        }
      }
    });

    return {
      labels: ['Buena Actitud', 'Regular Actitud', 'Mala Actitud'],
      datasets: [
        {
          label: 'Cantidad de Alumnos',
          data: [counts['Buena Actitud'], counts['Regular Actitud'], counts['Mala Actitud']],
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)', // Verde para Buena Actitud
            'rgba(234, 179, 8, 0.7)', // Amarillo para Regular Actitud
            'rgba(239, 68, 68, 0.7)', // Rojo para Mala Actitud
          ],
          borderColor: [
            'rgba(4, 120, 87, 1)',
            'rgba(202, 138, 4, 1)',
            'rgba(220, 38, 38, 1)',
          ],
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 30,
          hoverBackgroundColor: [
            'rgba(16, 185, 129, 0.9)',
            'rgba(234, 179, 8, 0.9)',
            'rgba(239, 68, 68, 0.9)',
          ],
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 16, weight: 'bold' },
          color: '#1F2937',
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'Distribución de Comportamientos',
        font: { size: 20, weight: 'bold' },
        color: '#1F2937',
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 14 }, color: '#4B5563' },
        grid: { display: false },
      },
      y: {
        ticks: { font: { size: 14 }, color: '#4B5563', beginAtZero: true },
        grid: {
          color: 'rgba(209, 213, 219, 0.3)',
          borderDash: [5, 5],
        },
        beginAtZero: true,
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
    elements: {
      bar: {
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
      },
    },
  };

  const exportToPDF = async () => {
    if (!comportamientoChartRef.current || !selectedGrupo || !selectedFecha) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor = '#1E3A8A';
    const secondaryColor = '#4B5563';
    const accentColor = '#E5E7EB';

    // Encabezado
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('Informe de Comportamiento', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Grupo: ${selectedGrupo}`, 20, 30);
    doc.text(`Fecha: ${selectedFecha}`, 20, 36);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    let lastY = 48;

    // Gráfica
    if (comportamientoChartRef.current) {
      const canvas = await html2canvas(comportamientoChartRef.current);
      const imgData = canvas.toDataURL('image/png');
      doc.text('Distribución de Comportamientos', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, 170, 80);
      lastY += 90;
    }

    // Tablas por comportamiento
    const comportamientosFiltrados = comportamientos.filter(
      (c) => c.alumnos.grupo === selectedGrupo && c.fecha === selectedFecha
    );

    const categorias = ['Buena Actitud', 'Regular Actitud', 'Mala Actitud'];
    const categoriaColors = {
      'Buena Actitud': '#10B981',
      'Regular Actitud': '#EAB308',
      'Mala Actitud': '#EF4444',
    };

    categorias.forEach((categoria) => {
      const datosCategoria = comportamientosFiltrados
        .filter((c) => c.categoria === categoria)
        .map((c) => [
          `${c.alumnos.nombre} ${c.alumnos.apellido_paterno} ${c.alumnos.apellido_materno || ''}`,
          c.categoria,
          c.descripcion || 'Sin descripción',
        ]);

      if (datosCategoria.length > 0) {
        if (lastY > 240) {
          doc.addPage();
          lastY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(secondaryColor);
        doc.text(`Alumnos con ${categoria}`, 20, lastY);
        lastY += 10;

        doc.autoTable({
          startY: lastY,
          head: [['Nombre', 'Categoría', 'Descripción']],
          body: datosCategoria,
          theme: 'striped',
          styles: { font: 'helvetica', fontSize: 10, textColor: secondaryColor, cellPadding: 3 },
          headStyles: {
            fillColor: categoriaColors[categoria],
            textColor: '#FFFFFF',
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center',
          },
          alternateRowStyles: { fillColor: accentColor },
          margin: { left: 20, right: 20 },
        });

        lastY = (doc as any).lastAutoTable.finalY + 10;
      }
    });

    doc.save(`comportamiento_${selectedGrupo}_${selectedFecha}.pdf`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  const grupos = [...new Set(alumnos.map((a) => a.grupo))];
  const alumnosFiltrados = alumnos.filter((a) => a.grupo === selectedGrupo);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="p-4 md:p-6 flex-grow max-w-7xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 text-center md:text-left">Control de Comportamiento</h2>
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
          {message && (
            <div className={`mb-4 p-3 rounded-md ${message.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {!escuelaIdFromUrl && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">Ingresa un ID de escuela (UUID):</label>
              <input
                type="text"
                value={manualEscuelaId}
                onChange={(e) => setManualEscuelaId(e.target.value)}
                placeholder="Ejemplo: 123e4567-e89b-12d3-a456-426614174000"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Grupo:</label>
              <select
                value={selectedGrupo}
                onChange={(e) => setSelectedGrupo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              >
                <option value="">Selecciona un grupo</option>
                {grupos.map((grupo) => (
                  <option key={grupo} value={grupo}>{grupo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha:</label>
              <input
                type="date"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>
          </div>

          {alertas.length > 0 && (
            <div className="mb-6 space-y-2">
              {alertas.map((alerta, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md ${
                    alerta.tipo === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  <strong>{alerta.tipo === 'danger' ? 'Urgente' : 'Alerta'}:</strong> {alerta.mensaje}
                </div>
              ))}
            </div>
          )}

          {selectedGrupo && selectedFecha && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Registro de Comportamiento</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="mb-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                >
                  {editMode ? 'Desactivar Edición' : 'Activar Edición'}
                </button>
                <div className="p-6 bg-white rounded-lg shadow-md mb-6">
                  <table className="min-w-full bg-gray-50 rounded-lg">
                    <thead>
                      <tr className="bg-blue-100 text-gray-700">
                        <th className="py-2 px-4 text-left text-sm font-medium">Nombre</th>
                        <th className="py-2 px-4 text-left text-sm font-medium">Categoría</th>
                        <th className="py-2 px-4 text-left text-sm font-medium">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosFiltrados.map((alumno) => (
                        <tr key={alumno.id} className="border-b">
                          <td className="py-2 px-4 text-sm">
                            {alumno.nombre} {alumno.apellido_paterno} {alumno.apellido_materno || ''}
                          </td>
                          <td className="py-2 px-4 text-sm">
                            {editMode ? (
                              <select
                                value={comportamientoInputs[alumno.id]?.categoria || ''}
                                onChange={(e) => handleInputChange(alumno.id, 'categoria', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                              >
                                <option value="">Selecciona</option>
                                <option value="Buena Actitud">Buena Actitud</option>
                                <option value="Regular Actitud">Regular Actitud</option>
                                <option value="Mala Actitud">Mala Actitud</option>
                              </select>
                            ) : (
                              comportamientos
                                .filter((c) => c.alumno_id === alumno.id && c.fecha === selectedFecha)
                                .map((c) => c.categoria)
                                .join(', ') || 'Sin registro'
                            )}
                          </td>
                          <td className="py-2 px-4 text-sm">
                            {editMode ? (
                              <input
                                type="text"
                                value={comportamientoInputs[alumno.id]?.descripcion || ''}
                                onChange={(e) => handleInputChange(alumno.id, 'descripcion', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                placeholder="Descripción (ej. Mal portado)"
                              />
                            ) : (
                              comportamientos
                                .filter((c) => c.alumno_id === alumno.id && c.fecha === selectedFecha)
                                .map((c) => c.descripcion || 'Sin descripción')
                                .join(', ')
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editMode && (
                  <button
                    onClick={handleSaveComportamiento}
                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
                  >
                    Guardar Comportamiento
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Distribución de Comportamientos</h3>
                <div ref={comportamientoChartRef} className="h-80 bg-white rounded-lg shadow-md p-4">
                  <Bar data={prepareComportamientoData()} options={chartOptions} />
                </div>
              </div>

              <button
                onClick={exportToPDF}
                className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
              >
                Exportar Informe de Comportamiento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comportamiento;