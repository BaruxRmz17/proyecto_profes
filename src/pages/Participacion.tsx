import React, { useEffect, useState, useRef } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Participacion: React.FC = () => {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [selectedMateria, setSelectedMateria] = useState<string>('');
  const [selectedFiltro, setSelectedFiltro] = useState<'semana' | 'mes'>('semana');
  const [selectedFecha, setSelectedFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [participacionData, setParticipacionData] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [manualEscuelaId, setManualEscuelaId] = useState<string>('');
  const [bajaParticipacion, setBajaParticipacion] = useState<string[]>([]);

  const participacionIndividualRef = useRef<HTMLDivElement>(null);
  const participacionGrupalRef = useRef<HTMLDivElement>(null);
  const rankingRef = useRef<HTMLDivElement>(null);

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
        const [{ data: alumnosData, error: alumnosError }, { data: calificacionesData, error: calificacionesError }, { data: materiasData, error: materiasError }] = await Promise.all([
          supabase.from('alumnos').select('*').eq('escuela_id', escuelaId),
          supabase.from('calificaciones').select(`
            *,
            alumnos (
              id,
              nombre,
              apellido_paterno,
              apellido_materno,
              grupo
            )
          `).eq('tipo_evaluacion', 'participacion'),
          supabase.from('materias').select('nombre').eq('escuela_id', escuelaId),
        ]);

        if (alumnosError) throw new Error('Error al cargar los alumnos: ' + alumnosError.message);
        setAlumnos(alumnosData || []);

        if (calificacionesError) throw new Error('Error al cargar las participaciones: ' + calificacionesError.message);
        setCalificaciones(calificacionesData || []);

        if (materiasError) throw new Error('Error al cargar las materias: ' + materiasError.message);
        setMaterias(materiasData || []);

      } catch (error) {
        setMessage({ text: error.message, isSuccess: false });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [escuelaId, navigate]);

  useEffect(() => {
    if (selectedGrupo && selectedMateria && selectedFecha) {
      let filteredCalificaciones = calificaciones.filter(
        (c) => c.alumnos.grupo === selectedGrupo && c.materia === selectedMateria
      );

      const fecha = new Date(selectedFecha);
      switch (selectedFiltro) {
        case 'semana':
          const startOfWeek = new Date(fecha.setDate(fecha.getDate() - fecha.getDay()));
          const endOfWeek = new Date(fecha.setDate(fecha.getDate() - fecha.getDay() + 6));
          filteredCalificaciones = filteredCalificaciones.filter((c) => {
            const cDate = new Date(c.created_at);
            return cDate >= startOfWeek && cDate <= endOfWeek;
          });
          break;
        case 'mes':
          filteredCalificaciones = filteredCalificaciones.filter((c) => {
            const cDate = new Date(c.created_at);
            return cDate.getFullYear() === fecha.getFullYear() && cDate.getMonth() === fecha.getMonth();
          });
          break;
      }

      const alumnosFiltrados = alumnos.filter((a) => a.grupo === selectedGrupo);
      const data = alumnosFiltrados.map((alumno) => {
        const participaciones = filteredCalificaciones.filter((c) => c.alumno_id === alumno.id);
        const promedio = participaciones.length
          ? participaciones.reduce((sum: number, c: any) => sum + c.calificacion, 0) / participaciones.length
          : 0;
        return {
          id: alumno.id,
          nombre: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
          calificacion: promedio,
          participaciones: participaciones.length ? participaciones[0].calificacion : 0,
        };
      });

      setParticipacionData(data);

      const bajas = data.filter((d) => d.calificacion < 5).map((d) => d.nombre);
      setBajaParticipacion(bajas);
    }
  }, [selectedGrupo, selectedMateria, selectedFecha, selectedFiltro, alumnos, calificaciones]);

  const handleSaveParticipacion = async () => {
    if (!selectedGrupo || !selectedMateria || !selectedFecha || !escuelaId) {
      setMessage({ text: 'Selecciona grupo, materia y fecha antes de guardar.', isSuccess: false });
      return;
    }

    const userId = await getUserId();
    if (!userId) return;

    setLoading(true);
    try {
      const updates = participacionData.map((p: any) =>
        supabase.from('calificaciones').upsert({
          alumno_id: p.id,
          materia: selectedMateria,
          periodo: 'Trimestre 1',
          tipo_evaluacion: 'participacion',
          calificacion: p.participaciones,
          creado_por: userId,
          escuela_id: escuelaId,
          created_at: new Date().toISOString(),
        }, { onConflict: ['alumno_id', 'materia', 'periodo', 'tipo_evaluacion'] })
      );

      const results = await Promise.all(updates);
      if (results.every((r) => !r.error)) {
        const { data: updatedCalificaciones, error: calificacionesError } = await supabase
          .from('calificaciones')
          .select(`
            *,
            alumnos (
              id,
              nombre,
              apellido_paterno,
              apellido_materno,
              grupo
            )
          `)
          .eq('tipo_evaluacion', 'participacion')
          .eq('escuela_id', escuelaId);

        if (calificacionesError) throw new Error('Error al recargar calificaciones: ' + calificacionesError.message);
        setCalificaciones(updatedCalificaciones || []);
        setEditMode(false);
        setMessage({ text: 'Participación guardada correctamente.', isSuccess: true });
      } else {
        throw new Error('Error al guardar la participación: ' + results.find((r) => r.error)?.error?.message);
      }
    } catch (error) {
      setMessage({ text: error.message, isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const prepareIndividualData = () => {
    return {
      labels: participacionData.map((p) => p.nombre),
      datasets: [
        {
          label: 'Participación',
          data: participacionData.map((p) => p.calificacion),
          backgroundColor: 'rgba(59, 130, 246, 0.7)', // Azul vibrante
          borderColor: 'rgba(29, 78, 216, 1)',
          borderWidth: 2,
          borderRadius: 8, // Bordes redondeados
          barThickness: 20,
          hoverBackgroundColor: 'rgba(59, 130, 246, 0.9)',
        },
      ],
    };
  };

  const prepareGrupalData = () => {
    const grupos = [...new Set(alumnos.map((a) => a.grupo))];
    const data = grupos.map((grupo) => {
      const califs = calificaciones.filter(
        (c) =>
          c.alumnos.grupo === grupo &&
          c.materia === selectedMateria &&
          (selectedFiltro === 'semana'
            ? new Date(c.created_at) >= new Date(new Date(selectedFecha).setDate(new Date(selectedFecha).getDate() - new Date(selectedFecha).getDay())) &&
              new Date(c.created_at) <= new Date(new Date(selectedFecha).setDate(new Date(selectedFecha).getDate() - new Date(selectedFecha).getDay() + 6))
            : new Date(c.created_at).getFullYear() === new Date(selectedFecha).getFullYear() &&
              new Date(c.created_at).getMonth() === new Date(selectedFecha).getMonth())
      );
      const promedio = califs.length
        ? califs.reduce((sum: number, c: any) => sum + c.calificacion, 0) / califs.length
        : 0;
      return { grupo, promedio };
    });

    return {
      labels: data.map((d) => d.grupo),
      datasets: [
        {
          label: 'Promedio de Participación',
          data: data.map((d) => d.promedio),
          backgroundColor: 'rgba(16, 185, 129, 0.7)', // Verde esmeralda
          borderColor: 'rgba(4, 120, 87, 1)',
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 20,
          hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
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
          color: '#1F2937', // Gris oscuro
          padding: 20,
        },
      },
      title: {
        display: true,
        text: '',
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
        ticks: { font: { size: 14 }, color: '#4B5563', beginAtZero: true, max: 10 },
        grid: {
          color: 'rgba(209, 213, 219, 0.3)', // Cuadrícula sutil
          borderDash: [5, 5],
        },
        beginAtZero: true,
        max: 10,
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
    if (!participacionIndividualRef.current || !participacionGrupalRef.current || !rankingRef.current) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor = '#1E3A8A';
    const secondaryColor = '#4B5563';
    const accentColor = '#E5E7EB';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('Informe de Participación', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Grupo: ${selectedGrupo}`, 20, 30);
    doc.text(`Materia: ${selectedMateria}`, 20, 36);
    doc.text(`Filtro: ${selectedFiltro}`, 20, 42);
    doc.text(`Fecha: ${selectedFecha}`, 20, 48);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 54, 190, 54);

    doc.text('Ranking de Participación', 20, 60);
    doc.autoTable({
      startY: 66,
      head: [['Nombre', 'Promedio']],
      body: participacionData
        .sort((a, b) => b.calificacion - a.calificacion)
        .map((p) => [p.nombre, p.calificacion.toFixed(2)]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, textColor: secondaryColor, cellPadding: 3 },
      headStyles: { fillColor: primaryColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: accentColor },
      margin: { left: 20, right: 20 },
    });

    const chartWidth = 150;
    const chartHeight = 80;
    let lastY = (doc as any).lastAutoTable.finalY + 10;

    if (participacionIndividualRef.current) {
      const canvas = await html2canvas(participacionIndividualRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Participación Individual', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 10;
    }

    if (participacionGrupalRef.current) {
      const canvas = await html2canvas(participacionGrupalRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Participación Grupal', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
    }

    doc.save(`participacion_${selectedGrupo}_${selectedMateria}_${selectedFecha}.pdf`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  const grupos = [...new Set(alumnos.map((a) => a.grupo))];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="p-4 md:p-6 flex-grow max-w-7xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 text-center md:text-left">Control de Participación</h2>
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

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Materia:</label>
              {materias.length > 0 ? (
                <select
                  value={selectedMateria}
                  onChange={(e) => setSelectedMateria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                >
                  <option value="">Selecciona una materia</option>
                  {materias.map((materia) => (
                    <option key={materia.nombre} value={materia.nombre}>{materia.nombre}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">
                  No hay materias creadas para esta escuela. Crea materias en la tabla 'materias'.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtro:</label>
              <select
                value={selectedFiltro}
                onChange={(e) => setSelectedFiltro(e.target.value as 'semana' | 'mes')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              >
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>
          </div>

          {bajaParticipacion.length > 0 && (
            <div className="mb-6 p-3 bg-yellow-100 text-yellow-700 rounded-md">
              <strong>Alerta:</strong> Los siguientes alumnos tienen baja participación (promedio {'<'} 5): {bajaParticipacion.join(', ')}.
            </div>
          )}

          {selectedGrupo && selectedMateria && selectedFecha && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Registro Rápido de Participación</h3>
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
                        <th className="py-2 px-4 text-left text-sm font-medium">Puntuación (0-10)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participacionData.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="py-2 px-4 text-sm">{p.nombre}</td>
                          <td className="py-2 px-4 text-sm">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={p.participaciones}
                                onChange={(e) =>
                                  setParticipacionData((prev) =>
                                    prev.map((d) =>
                                      d.id === p.id
                                        ? { ...d, participaciones: Math.max(0, Math.min(10, parseFloat(e.target.value))) }
                                        : d
                                    )
                                  )
                                }
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                              />
                            ) : p.calificacion.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editMode && (
                  <button
                    onClick={handleSaveParticipacion}
                    className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
                  >
                    Guardar Participación
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Ranking de Participación</h3>
                <div ref={rankingRef} className="p-6 bg-white rounded-lg shadow-md mb-6">
                  <table className="min-w-full bg-gray-50 rounded-lg">
                    <thead>
                      <tr className="bg-blue-100 text-gray-700">
                        <th className="py-2 px-4 text-left text-sm font-medium">Nombre</th>
                        <th className="py-2 px-4 text-left text-sm font-medium">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participacionData
                        .sort((a, b) => b.calificacion - a.calificacion)
                        .map((p, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-4 text-sm">{p.nombre}</td>
                            <td className="py-2 px-4 text-sm">{p.calificacion.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Participación Individual</h3>
                <div ref={participacionIndividualRef} className="h-80 bg-white rounded-lg shadow-md p-4">
                  <Bar
                    data={prepareIndividualData()}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { ...chartOptions.plugins.title, text: 'Participación Individual' },
                      },
                    }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Participación Grupal</h3>
                <div ref={participacionGrupalRef} className="h-80 bg-white rounded-lg shadow-md p-4">
                  <Bar
                    data={prepareGrupalData()}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { ...chartOptions.plugins.title, text: 'Participación Grupal' },
                      },
                    }}
                  />
                </div>
              </div>

              <button
                onClick={exportToPDF}
                className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
              >
                Exportar Informe de Participación
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Participacion;