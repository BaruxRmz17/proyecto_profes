import React, { useEffect, useState, useRef } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Bar, Line, Pie } from 'react-chartjs-2'; // Note: Radar is replaced with Line
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ReportesDesempeno: React.FC = () => {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState<any[]>([]);
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPeriodType, setSelectedPeriodType] = useState<string>('Trimestre');
  const [periodCount, setPeriodCount] = useState<number>(3);
  const [selectedMateria, setSelectedMateria] = useState<string>('');
  const [customFields, setCustomFields] = useState<string[]>(['examenes', 'tareas', 'participacion', 'asistencia']);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualEscuelaId, setManualEscuelaId] = useState<string>('');

  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null); // Changed from radarChartRef to lineChartRef
  const pieChartRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const escuelaIdFromUrl = new URLSearchParams(location.search).get('escuelaId');
  const escuelaId = escuelaIdFromUrl || manualEscuelaId;

  const periodOptions = Array.from({ length: periodCount }, (_, i) =>
    `${selectedPeriodType === 'Bimestre' ? 'Bimestre' : selectedPeriodType === 'Anual' ? 'Año' : 'Trimestre'} ${i + 1}`
  );

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Usuario no autenticado:', userError);
        setUserId(null);
        navigate('/login');
        return;
      } else {
        setUserId(user.id);
      }

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
        console.error('Error fetching alumnos:', alumnosError);
        setErrorMessage('Error al cargar los alumnos: ' + alumnosError.message);
      } else if (!alumnosData || alumnosData.length === 0) {
        setErrorMessage('No se encontraron alumnos para esta escuela.');
      } else {
        setAlumnos(alumnosData);
        setFilteredAlumnos(alumnosData);
      }

      const { data: calificacionesData, error: calificacionesError } = await supabase
        .from('calificaciones')
        .select(`
          *,
          alumnos (
            id,
            nombre,
            apellido_paterno,
            apellido_materno,
            numero_matricula
          )
        `);

      if (calificacionesError) {
        console.error('Error fetching calificaciones:', calificacionesError);
        setErrorMessage('Error al cargar las calificaciones: ' + calificacionesError.message);
      } else {
        const filteredCalificaciones = calificacionesData.filter((calificacion) =>
          alumnosData.some((alumno) => alumno.id === calificacion.alumno_id && alumno.escuela_id === escuelaId)
        );
        setCalificaciones(filteredCalificaciones || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [escuelaId, navigate]);

  useEffect(() => {
    const filtered = alumnos.filter((alumno) => {
      const fullName = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.toLowerCase();
      const numeroMatricula = alumno.numero_matricula?.toLowerCase() || '';
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || numeroMatricula.includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    setFilteredAlumnos(filtered);
  }, [searchTerm, alumnos]);

  const calculateAverages = (alumnoId: string, materiaFilter: string = '') => {
    const califs = calificaciones.filter((c) => c.alumno_id === alumnoId && (!materiaFilter || c.materia === materiaFilter));
    const groupedByMateriaAndPeriodo = califs.reduce((acc: any, calif: any) => {
      const key = `${calif.materia}-${calif.periodo}`;
      if (!acc[key]) {
        acc[key] = { calificaciones: {}, comentarios: [] };
      }
      acc[key].calificaciones[calif.tipo_evaluacion] = calif.calificacion;
      if (calif.comentarios) {
        acc[key].comentarios.push(calif.comentarios);
      }
      return acc;
    }, {});

    const averages: any[] = [];
    Object.keys(groupedByMateriaAndPeriodo).forEach((key) => {
      const [materia, periodo] = key.split('-');
      const califs = groupedByMateriaAndPeriodo[key].calificaciones;
      const comentarios = groupedByMateriaAndPeriodo[key].comentarios;
      const validFields = customFields.filter((field) => califs[field] !== undefined);
      const promedio = validFields.length > 0
        ? (validFields.reduce((sum: number, field: string) => sum + (califs[field] || 0), 0) / validFields.length).toFixed(2)
        : 'N/A';
      averages.push({ materia, periodo, promedio, comentarios });
    });

    return averages;
  };

  const prepareChartData = (averages: any[], chartType: string) => {
    const labels = averages.map((avg) => `${avg.materia} (${avg.periodo})`);
    const data = averages.map((avg) => parseFloat(avg.promedio) || 0);

    const colors = {
      bar: {
        backgroundColor: 'rgba(75, 192, 192, 0.6)', // Verde turquesa
        borderColor: 'rgba(75, 192, 192, 1)',
      },
      line: { // Updated for Line chart to match the provided chart
        backgroundColor: 'rgba(0, 255, 255, 0.2)', // Cyan fill with transparency
        borderColor: 'rgba(0, 255, 255, 1)', // Cyan line
      },
      pie: {
        backgroundColor: labels.map((_, i) => [
          'rgba(255, 99, 132, 0.6)',  // Rosa
          'rgba(54, 162, 235, 0.6)',  // Azul
          'rgba(255, 206, 86, 0.6)',  // Amarillo
          'rgba(153, 102, 255, 0.6)', // Púrpura
          'rgba(75, 192, 192, 0.6)',  // Verde turquesa
        ][i % 5]),
        borderColor: labels.map((_, i) => [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(75, 192, 192, 1)',
        ][i % 5]),
      },
    };

    return {
      labels,
      datasets: [
        {
          label: chartType === 'line' ? 'Desempeño por Materia ($)' : 'Promedio', // Updated label for Line chart
          data,
          backgroundColor: chartType === 'bar' ? colors.bar.backgroundColor : chartType === 'line' ? colors.line.backgroundColor : colors.pie.backgroundColor,
          borderColor: chartType === 'bar' ? colors.bar.borderColor : chartType === 'line' ? colors.line.borderColor : colors.pie.borderColor,
          borderWidth: 1,
          fill: chartType === 'line' ? true : false, // Fill the area under the line
          tension: 0.1, // Slight curve for the line
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 14 } } },
      title: { display: true, text: 'Desempeño por Materia/Periodo', font: { size: 16 } },
    },
    scales: {
      x: { ticks: { font: { size: 12 } } },
      y: { ticks: { font: { size: 12 } }, beginAtZero: true, max: 10 },
    },
  };

  const lineOptions = { // New options for the Line chart to match the provided chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { size: 14 } },
      },
      title: {
        display: true,
        text: 'Desempeño por Materia/Periodo',
        font: { size: 16 },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 12 } },
        grid: { display: false }, // No grid lines on X-axis
      },
      y: {
        title: { display: true, text: 'Promedio ($)', font: { size: 12 } }, // Y-axis label
        ticks: { font: { size: 12 } },
        beginAtZero: true,
        max: 10,
        grid: { display: false }, // No grid lines on Y-axis
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 14 } } },
      title: { display: true, text: 'Desempeño por Materia/Periodo', font: { size: 16 } },
    },
  };

  const exportToPDF = async (alumno: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor = '#1E3A8A';
    const secondaryColor = '#4B5563';
    const accentColor = '#E5E7EB';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('Reporte de Desempeño', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Alumno: ${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`, 20, 30);
    doc.text(`Número de Matrícula: ${alumno.numero_matricula || 'N/A'}`, 20, 36);
    doc.text(`Grupo: ${alumno.grupo || 'N/A'}`, 20, 42);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 48);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 54, 190, 54);

    const averages = calculateAverages(alumno.id, selectedMateria);
    const tableData = averages.map((avg, index) => [
      index + 1,
      avg.materia,
      avg.periodo,
      avg.promedio,
      comments[`${alumno.id}-${avg.materia}-${avg.periodo}`] || avg.comentarios.join('; ') || 'Sin comentarios',
    ]);

    doc.autoTable({
      startY: 60,
      head: [['#', 'Materia', 'Periodo', 'Promedio', 'Comentarios']],
      body: tableData,
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, textColor: secondaryColor, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: primaryColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: accentColor },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 30 }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 70 } },
      margin: { top: 60, left: 20, right: 20 },
    });

    let lastY = (doc as any).lastAutoTable.finalY + 10;

    const chartWidth = 150;
    const chartHeight = 80;

    if (barChartRef.current) {
      const canvas = await html2canvas(barChartRef.current);
      const imgData = canvas.toDataURL('image/png');
      doc.text('Gráfico de Barras', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 10;
    }

    if (lineChartRef.current) { // Updated to lineChartRef
      const canvas = await html2canvas(lineChartRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Gráfico de Línea', 20, lastY); // Updated title
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 10;
    }

    if (pieChartRef.current) {
      const canvas = await html2canvas(pieChartRef.current);
      const imgData = canvas.toDataURL('image/png');
      if (lastY + chartHeight > 270) {
        doc.addPage();
        lastY = 20;
      }
      doc.text('Gráfico de Pastel', 20, lastY);
      lastY += 10;
      doc.addImage(imgData, 'PNG', 20, lastY, chartWidth, chartHeight);
      lastY += chartHeight + 10;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`reporte_desempeno_${alumno.numero_matricula || alumno.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = (alumno: any) => {
    const averages = calculateAverages(alumno.id, selectedMateria);
    const wsData = averages.map((avg, index) => ({
      '#': index + 1,
      Materia: avg.materia,
      Periodo: avg.periodo,
      Promedio: avg.promedio,
      Comentarios: comments[`${alumno.id}-${avg.materia}-${avg.periodo}`] || avg.comentarios.join('; ') || 'Sin comentarios',
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Desempeño');
    XLSX.writeFile(wb, `reporte_desempeno_${alumno.numero_matricula || alumno.id}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  const selectedAlumnoData = alumnos.find((a) => a.id === selectedAlumno);
  const averages = selectedAlumno ? calculateAverages(selectedAlumno, selectedMateria) : [];
  const barData = prepareChartData(averages, 'bar');
  const lineData = prepareChartData(averages, 'line'); // Updated to 'line'
  const pieData = prepareChartData(averages, 'pie');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="p-4 md:p-6 flex-grow max-w-7xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 text-center md:text-left">Reportes de Desempeño por Alumno</h2>
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
          {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{errorMessage}</div>}

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

          <div className="mb-6 space-y-6">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 items-center">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por Nombre o Número de Matrícula:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
              </div>
              <div className="w-full md:w-[300px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Alumno:</label>
                <select
                  value={selectedAlumno}
                  onChange={(e) => setSelectedAlumno(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                >
                  <option value="">Selecciona un alumno</option>
                  {filteredAlumnos.map((alumno) => (
                    <option key={alumno.id} value={alumno.id}>
                      {`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''} (${alumno.numero_matricula || 'N/A'})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Periodo:</label>
                <select
                  value={selectedPeriodType}
                  onChange={(e) => {
                    setSelectedPeriodType(e.target.value);
                    setSelectedAlumno('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                >
                  <option value="Bimestre">Bimestre</option>
                  <option value="Trimestre">Trimestre</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Periodos:</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={periodCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    setPeriodCount(count);
                    setSelectedAlumno('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Materia:</label>
                <select
                  value={selectedMateria}
                  onChange={(e) => setSelectedMateria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                >
                  <option value="">Todas las materias</option>
                  {[...new Set(calificaciones.map((c) => c.materia))].map((materia) => (
                    <option key={materia} value={materia}>{materia}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campos Personalizables:</label>
              <div className="flex flex-wrap gap-4">
                {['examenes', 'tareas', 'participacion', 'asistencia'].map((field) => (
                  <label key={field} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCustomFields([...customFields, field]);
                        } else {
                          setCustomFields(customFields.filter((f) => f !== field));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition duration-200"
                    />
                    <span className="text-sm text-gray-700 capitalize">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {selectedAlumno && (
            <div className="mt-8">
              <h3 className="text-lg md:text-xl font-medium mb-2 text-gray-700 text-center md:text-left">
                Reporte de Desempeño - {selectedAlumnoData?.nombre} {selectedAlumnoData?.apellido_paterno} {selectedAlumnoData?.apellido_materno || ''}
              </h3>
              <p className="text-sm text-gray-600 mb-4 text-center md:text-left">
                Número de Matrícula: {selectedAlumnoData?.numero_matricula || 'N/A'} | Grupo: {selectedAlumnoData?.grupo || 'N/A'}
              </p>

              {averages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">No hay calificaciones registradas para este alumno.</p>
              ) : (
                <>
                  <div className="overflow-x-auto mb-8 rounded-lg shadow-md">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-blue-100 text-gray-700 text-left">
                          <th className="py-3 px-4 text-sm font-medium">#</th>
                          <th className="py-3 px-4 text-sm font-medium">Materia</th>
                          <th className="py-3 px-4 text-sm font-medium">Periodo</th>
                          <th className="py-3 px-4 text-sm font-medium">Promedio</th>
                          <th className="py-3 px-4 text-sm font-medium">Comentarios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {averages.map((avg, index) => (
                          <tr key={`${avg.materia}-${avg.periodo}`} className="border-b hover:bg-gray-50 transition duration-150">
                            <td className="py-3 px-4 text-sm">{index + 1}</td>
                            <td className="py-3 px-4 text-sm">{avg.materia}</td>
                            <td className="py-3 px-4 text-sm">{avg.periodo}</td>
                            <td className="py-3 px-4 text-sm">{avg.promedio}</td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={comments[`${selectedAlumno}-${avg.materia}-${avg.periodo}`] || avg.comentarios.join('; ') || ''}
                                onChange={(e) =>
                                  setComments({
                                    ...comments,
                                    [`${selectedAlumno}-${avg.materia}-${avg.periodo}`]: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <h4 className="text-md font-medium mb-3 text-gray-700 text-center">Gráfico de Barras</h4>
                      <div ref={barChartRef} className="h-64">
                        <Bar data={barData} options={chartOptions} />
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <h4 className="text-md font-medium mb-3 text-gray-700 text-center">Gráfico de Línea</h4>
                      <div ref={lineChartRef} className="h-64">
                        <Line data={lineData} options={lineOptions} /> {/* Updated to Line chart */}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <h4 className="text-md font-medium mb-3 text-gray-700 text-center">Gráfico de Pastel</h4>
                      <div ref={pieChartRef} className="h-64">
                        <Pie data={pieData} options={pieOptions} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-6 flex flex-col sm:flex-row justify-center sm:justify-start gap-4">
                <button
                  onClick={() => exportToPDF(selectedAlumnoData)}
                  className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
                >
                  Exportar a PDF
                </button>
                <button
                  onClick={() => exportToExcel(selectedAlumnoData)}
                  className="bg-yellow-600 text-white py-2 px-6 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200"
                >
                  Exportar a Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportesDesempeno;