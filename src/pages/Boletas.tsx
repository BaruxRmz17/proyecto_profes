import React, { useEffect, useState, useRef } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const Boletas: React.FC = () => {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<string>('');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [boletaTipo, setBoletaTipo] = useState<'Por Periodo' | 'Boleta Final'>('Por Periodo');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualEscuelaId, setManualEscuelaId] = useState<string>('');
  const [boletaData, setBoletaData] = useState<any>({});
  const [historialDescargas, setHistorialDescargas] = useState<string[]>([]);

  const boletaRef = useRef<HTMLDivElement>(null);

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
      setAlumnos(alumnosData || []);

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

      // Cargar historial desde localStorage
      const savedHistorial = localStorage.getItem('boletaHistorial');
      if (savedHistorial) {
        setHistorialDescargas(JSON.parse(savedHistorial));
      }
    };

    fetchData();
  }, [escuelaId, navigate]);

  useEffect(() => {
    if (selectedAlumno) {
      if (boletaTipo === 'Por Periodo' && selectedPeriodo) {
        const alumno = alumnos.find((a) => a.id === selectedAlumno);
        if (alumno) {
          const califs = calificaciones.filter(
            (c) =>
              c.alumno_id === selectedAlumno &&
              c.periodo === selectedPeriodo
          );

          const criterios = [...new Set(califs.map((c) => c.tipo_evaluacion))];
          const data = {
            nombre: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
            matricula: alumno.numero_matricula || 'N/A',
            grupo: alumno.grupo || 'N/A',
            periodo: selectedPeriodo,
            calificaciones: criterios.map((tipo) => ({
              criterio: tipo,
              promedio: califs
                .filter((c) => c.tipo_evaluacion === tipo)
                .reduce((sum, c) => sum + (c.calificacion || 0), 0) /
                Math.max(califs.filter((c) => c.tipo_evaluacion === tipo).length, 1),
            })),
          };
          setBoletaData(data);
        }
      } else if (boletaTipo === 'Boleta Final') {
        const alumno = alumnos.find((a) => a.id === selectedAlumno);
        if (alumno) {
          const califs = calificaciones.filter((c) => c.alumno_id === selectedAlumno);
          const periodos = [...new Set(califs.map((c) => c.periodo))];
          const criterios = [...new Set(califs.map((c) => c.tipo_evaluacion))];

          const totales = criterios.map((tipo) => ({
            criterio: tipo,
            total: califs
              .filter((c) => c.tipo_evaluacion === tipo)
              .reduce((sum, c) => sum + (c.calificacion || 0), 0),
            count: califs.filter((c) => c.tipo_evaluacion === tipo).length,
          }));

          const promedioFinal = totales.length
            ? totales.reduce((sum, t) => sum + (t.total / Math.max(t.count, 1)), 0) / totales.length
            : 0;

          const data = {
            nombre: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
            matricula: alumno.numero_matricula || 'N/A',
            grupo: alumno.grupo || 'N/A',
            periodo: 'Año Completo',
            calificaciones: totales.map((t) => ({
              criterio: t.criterio,
              promedio: t.total / Math.max(t.count, 1),
            })),
            promedioFinal: promedioFinal.toFixed(2),
          };
          setBoletaData(data);
        }
      }
    }
  }, [selectedAlumno, selectedPeriodo, boletaTipo, alumnos, calificaciones]);

  const exportToPDF = async () => {
    if (!boletaRef.current || !selectedAlumno) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor = '#1E3A8A';
    const secondaryColor = '#4B5563';
    const accentColor = '#E5E7EB';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text(`Boleta ${boletaTipo === 'Boleta Final' ? 'Final' : 'Por Periodo'}`, 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Alumno: ${boletaData.nombre}`, 20, 30);
    doc.text(`Matrícula: ${boletaData.matricula}`, 20, 36);
    doc.text(`Grupo: ${boletaData.grupo}`, 20, 42);
    doc.text(`Periodo: ${boletaData.periodo}`, 20, 48);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 54);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    doc.autoTable({
      startY: 66,
      head: [['Criterio', 'Promedio']],
      body: boletaData.calificaciones.map((c: any) => [c.criterio, c.promedio.toFixed(2)]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, textColor: secondaryColor, cellPadding: 3 },
      headStyles: { fillColor: primaryColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: accentColor },
      margin: { left: 20, right: 20 },
    });

    if (boletaTipo === 'Boleta Final') {
      doc.text(`Promedio Final del Año: ${boletaData.promedioFinal}`, 20, (doc as any).lastAutoTable.finalY + 10);
    }

    const canvas = await html2canvas(boletaRef.current);
    const imgData = canvas.toDataURL('image/png');
    doc.addPage();
    doc.addImage(imgData, 'PNG', 10, 10, 190, 277);

    const fileName = `boleta_${boletaTipo === 'Boleta Final' ? 'final' : 'periodo'}_${boletaData.matricula || selectedAlumno}_${boletaData.periodo || 'anual'}.pdf`;
    doc.save(fileName);

    // Actualizar historial
    const newHistorial = [
      ...historialDescargas,
      `Boleta ${boletaTipo} - ${boletaData.nombre} - ${boletaData.periodo || 'Año Completo'} - ${new Date().toLocaleString()}`,
    ];
    setHistorialDescargas(newHistorial);
    localStorage.setItem('boletaHistorial', JSON.stringify(newHistorial));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  const periodos = [...new Set(calificaciones.map((c) => c.periodo))];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="p-4 md:p-6 flex-grow max-w-7xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 text-center md:text-left">Generación de Boletas</h2>
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

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Alumno:</label>
              <select
                value={selectedAlumno}
                onChange={(e) => setSelectedAlumno(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              >
                <option value="">Selecciona un alumno</option>
                {alumnos.map((alumno) => (
                  <option key={alumno.id} value={alumno.id}>
                    {`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''} (${alumno.numero_matricula || 'N/A'})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Tipo de Boleta:</label>
              <select
                value={boletaTipo}
                onChange={(e) => setBoletaTipo(e.target.value as 'Por Periodo' | 'Boleta Final')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              >
                <option value="Por Periodo">Por Periodo</option>
                <option value="Boleta Final">Boleta Final</option>
              </select>
            </div>
            {boletaTipo === 'Por Periodo' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Periodo:</label>
                <select
                  value={selectedPeriodo}
                  onChange={(e) => setSelectedPeriodo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                >
                  <option value="">Selecciona un periodo</option>
                  {periodos.map((periodo) => (
                    <option key={periodo} value={periodo}>{periodo}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedAlumno && (boletaTipo === 'Por Periodo' ? selectedPeriodo : true) && (
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-700">Vista Previa de la Boleta</h3>
              <div ref={boletaRef} className="p-6 bg-white rounded-lg shadow-md mb-6">
                <h4 className="text-md font-medium mb-2 text-gray-700">Datos del Alumno</h4>
                <p><strong>Nombre:</strong> {boletaData.nombre}</p>
                <p><strong>Matrícula:</strong> {boletaData.matricula}</p>
                <p><strong>Grupo:</strong> {boletaData.grupo}</p>
                <p><strong>Periodo:</strong> {boletaData.periodo}</p>
                <h4 className="text-md font-medium mt-4 mb-2 text-gray-700">Calificaciones</h4>
                <table className="min-w-full bg-gray-50 rounded-lg">
                  <thead>
                    <tr className="bg-blue-100 text-gray-700">
                      <th className="py-2 px-4 text-left text-sm font-medium">Criterio</th>
                      <th className="py-2 px-4 text-left text-sm font-medium">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletaData.calificaciones?.map((c: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-4 text-sm">{c.criterio}</td>
                        <td className="py-2 px-4 text-sm">{c.promedio.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {boletaTipo === 'Boleta Final' && boletaData.promedioFinal && (
                  <p className="mt-4 text-md font-medium text-gray-700">
                    <strong>Promedio Final del Año:</strong> {boletaData.promedioFinal}
                  </p>
                )}
              </div>

              <button
                onClick={exportToPDF}
                className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
              >
                Exportar a PDF
              </button>
            </div>
          )}

          {/* Historial de Descargas */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Historial de Boletas Descargadas</h3>
            {historialDescargas.length === 0 ? (
              <p className="text-sm text-gray-500">No hay boletas descargadas aún.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-2">
                {historialDescargas.map((descarga, index) => (
                  <li key={index} className="text-sm text-gray-600">{descarga}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Boletas;