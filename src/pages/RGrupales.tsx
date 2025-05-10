import React, { useEffect, useState, useRef } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const EstadisticasGrupales: React.FC = () => {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualEscuelaId, setManualEscuelaId] = useState<string>('');

  const rendimientoGrupoRef = useRef<HTMLDivElement>(null);
  const rendimientoMateriaRef = useRef<HTMLDivElement>(null);
  const comparativaGruposRef = useRef<HTMLDivElement>(null);
  const participacionRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const escuelaIdFromUrl = new URLSearchParams(location.search).get('escuelaId');
  const escuelaId = escuelaIdFromUrl || manualEscuelaId;

  useEffect(() => {
    const fetchData = async () => {
      if (!escuelaId) {
        setErrorMessage('No se proporcionó un ID de escuela válido. Por favor, verifica la URL o ingresa uno manualmente.');
        setLoading(false);
        return;
      }

      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('*')
        .eq('escuela_id', escuelaId);

      if (alumnosError) {
        setErrorMessage('Error al cargar los alumnos: ' + alumnosError.message);
        setLoading(false);
        return;
      }

      const gruposUnicos = [...new Set(alumnosData.map((alumno: any) => alumno.grupo))].map((grupo) => ({
        grupo,
        alumnos: alumnosData.filter((alumno: any) => alumno.grupo === grupo),
      }));
      setGrupos(gruposUnicos);

      const { data: calificacionesData, error: calificacionesError } = await supabase
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
        `);

      if (calificacionesError) {
        setErrorMessage('Error al cargar las calificaciones: ' + calificacionesError.message);
      } else {
        setCalificaciones(calificacionesData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [escuelaId, navigate]);

  const calculateRendimientoPorGrupo = () => {
    return grupos.map((grupo) => {
      const califs = calificaciones.filter(
        (c) => c.alumnos.grupo === grupo.grupo && c.tipo_evaluacion !== 'participacion'
      );
      const promedio = califs.length
        ? (califs.reduce((sum: number, c: any) => sum + c.calificacion, 0) / califs.length).toFixed(2)
        : 'N/A';
      return { grupo: grupo.grupo, promedio };
    });
  };

  const calculateRendimientoPorMateria = () => {
    const materias = [...new Set(calificaciones.map((c) => c.materia))];
    return materias.map((materia) => {
      const califs = calificaciones.filter(
        (c) => c.tipo_evaluacion !== 'participacion' && c.materia === materia
      );
      const promedio = califs.length
        ? (califs.reduce((sum: number, c: any) => sum + c.calificacion, 0) / califs.length).toFixed(2)
        : 'N/A';
      return { materia, promedio };
    });
  };

  const calculateParticipacion = () => {
    return grupos.flatMap((grupo) =>
      grupo.alumnos.map((alumno: any) => {
        const parts = calificaciones.filter(
          (c) => c.alumno_id === alumno.id && c.tipo_evaluacion === 'participacion'
        );
        const promedio = parts.length
          ? (parts.reduce((sum: number, p: any) => sum + p.calificacion, 0) / parts.length).toFixed(2)
          : '0.00';
        return {
          alumno: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
          grupo: grupo.grupo,
          promedio,
        };
      })
    );
  };

  const prepareRendimientoGrupoData = () => {
    const data = calculateRendimientoPorGrupo();
    return {
      labels: data.map((d) => d.grupo),
      datasets: [
        {
          label: 'Promedio',
          data: data.map((d) => parseFloat(d.promedio) || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.7)', // Soft blue
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    };
  };

  const prepareRendimientoMateriaData = () => {
    const data = calculateRendimientoPorMateria();
    return {
      labels: data.map((d) => d.materia),
      datasets: [
        {
          label: 'Promedio',
          data: data.map((d) => parseFloat(d.promedio) || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.7)', // Soft teal
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    };
  };

  const prepareComparativaGruposData = () => {
    const materias = [...new Set(calificaciones.map((c) => c.materia))];
    const datasets = grupos.map((grupo, index) => {
      const califsPorMateria = materias.map((materia) => {
        const califs = calificaciones.filter(
          (c) =>
            c.alumnos.grupo === grupo.grupo &&
            c.materia === materia &&
            c.tipo_evaluacion !== 'participacion'
        );
        return califs.length
          ? califs.reduce((sum: number, c: any) => sum + c.calificacion, 0) / califs.length
          : 0;
      });
      return {
        label: grupo.grupo,
        data: califsPorMateria,
        borderColor: [
          'rgba(59, 130, 246, 1)', // Blue
          'rgba(16, 185, 129, 1)', // Teal
          'rgba(245, 158, 11, 1)', // Amber
          'rgba(236, 72, 153, 1)', // Pink
        ][index % 4],
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        pointBackgroundColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(236, 72, 153, 1)',
        ][index % 4],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      };
    });

    return {
      labels: materias,
      datasets,
    };
  };

  const prepareParticipacionData = () => {
    const data = calculateParticipacion();
    return {
      labels: data.map((d) => d.alumno),
      datasets: [
        {
          label: 'Puntuación de Participación',
          data: data.map((d) => parseFloat(d.promedio) || 0),
          backgroundColor: 'rgba(245, 158, 11, 0.7)', // Amber
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 14, weight: '600' } } },
      title: { display: true, text: '', font: { size: 16, weight: '600' } },
    },
    scales: {
      x: { ticks: { font: { size: 12 } }, grid: { display: false } },
      y: { ticks: { font: { size: 12 } }, beginAtZero: true, max: 10, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
    },
    animation: { duration: 1200, easing: 'easeInOutQuart' },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 14, weight: '600' } } },
      title: { display: true, text: 'Comparativa entre Grupos por Materia', font: { size: 16, weight: '600' } },
    },
    scales: {
      x: { ticks: { font: { size: 12 } }, grid: { display: false } },
      y: { ticks: { font: { size: 12 } }, beginAtZero: true, max: 10, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
    },
    animation: { duration: 1200, easing: 'easeInOutQuart' },
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor = '#3B82F6'; // Blue
    const secondaryColor = '#4B5563'; // Gray

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('Estadísticas Grupales', 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Escuela ID: ${escuelaId}`, 20, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 36);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    let lastY = 50;

    const participacionData = calculateParticipacion();
    doc.text('Participación por Alumno', 20, lastY);
    lastY += 10;
    doc.autoTable({
      startY: lastY,
      head: [['Alumno', 'Grupo', 'Puntuación Promedio']],
      body: participacionData.map((p) => [p.alumno, p.grupo, p.promedio]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, textColor: secondaryColor, cellPadding: 4 },
      headStyles: { fillColor: primaryColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: '#F9FAFB' },
      margin: { left: 20, right: 20 },
    });
    lastY = (doc as any).lastAutoTable.finalY + 15;

    const chartWidth = 160;
    const chartHeight = 80;

    if (rendimientoGrupoRef.current) {
      const canvas = await html2canvas(rendimientoGrupoRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Rendimiento por Grupo', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 15;
    }

    if (rendimientoMateriaRef.current) {
      const canvas = await html2canvas(rendimientoMateriaRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Rendimiento por Materia', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 15;
    }

    if (comparativaGruposRef.current) {
      const canvas = await html2canvas(comparativaGruposRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Comparativa entre Grupos por Materia', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 15;
    }

    if (participacionRef.current) {
      const canvas = await html2canvas(participacionRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Participación por Alumno', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 15;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`estadisticas_grupales_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const participacionData = calculateParticipacion();
    const pWs = XLSX.utils.json_to_sheet(participacionData);
    XLSX.utils.book_append_sheet(wb, pWs, 'Participación');
    XLSX.writeFile(wb, `estadisticas_grupales_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Cargando...</p>
      </div>
    );
  }

  const rendimientoGrupoData = prepareRendimientoGrupoData();
  const rendimientoMateriaData = prepareRendimientoMateriaData();
  const comparativaGruposData = prepareComparativaGruposData();
  const participacionData = prepareParticipacionData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Estadísticas Grupales</h1>
        <div className="bg-white rounded-xl shadow-lg p-6">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{errorMessage}</div>
          )}

          {!escuelaIdFromUrl && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingresa un ID de escuela (UUID):
              </label>
              <input
                type="text"
                value={manualEscuelaId}
                onChange={(e) => setManualEscuelaId(e.target.value)}
                placeholder="Ejemplo: 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Rendimiento por Grupo */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Rendimiento por Grupo</h2>
              <div ref={rendimientoGrupoRef} className="h-64">
                <Bar
                  data={rendimientoGrupoData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: { ...chartOptions.plugins.title, text: 'Rendimiento por Grupo' },
                    },
                  }}
                />
              </div>
            </div>

            {/* Rendimiento por Materia */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Rendimiento por Materia</h2>
              <div ref={rendimientoMateriaRef} className="h-64">
                <Bar
                  data={rendimientoMateriaData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: { ...chartOptions.plugins.title, text: 'Rendimiento por Materia' },
                    },
                  }}
                />
              </div>
            </div>

            {/* Comparativa entre Grupos */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Comparativa entre Grupos</h2>
              <div ref={comparativaGruposRef} className="h-64">
                <Line data={comparativaGruposData} options={lineOptions} />
              </div>
            </div>

            {/* Participación */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Participación por Alumno</h2>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full bg-white rounded-lg">
                  <thead>
                    <tr className="bg-blue-50 text-gray-700">
                      <th className="py-3 px-4 text-left font-semibold">Alumno</th>
                      <th className="py-3 px-4 text-left font-semibold">Grupo</th>
                      <th className="py-3 px-4 text-left font-semibold">Puntuación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateParticipacion().map((p, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{p.alumno}</td>
                        <td className="py-3 px-4">{p.grupo}</td>
                        <td className="py-3 px-4">{p.promedio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div ref={participacionRef} className="h-64">
                <Bar
                  data={participacionData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: { ...chartOptions.plugins.title, text: 'Participación por Alumno' },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={exportToPDF}
              className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
            >
              Exportar a PDF
            </button>
            <button
              onClick={exportToExcel}
              className="bg-teal-600 text-white py-2 px-6 rounded-lg hover:bg-teal-700 transition duration-300 shadow-md"
            >
              Exportar a Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasGrupales;