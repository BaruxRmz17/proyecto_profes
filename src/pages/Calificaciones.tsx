import React, { useEffect, useState } from 'react';
import supabase from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TrashIcon } from '@heroicons/react/outline';

const Calificaciones = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [newMateria, setNewMateria] = useState('');
  const [grades, setGrades] = useState({});
  const [percentages, setPercentages] = useState({
    examenes: 40,
    tareas: 30,
    proyectos: 30,
  });
  const [evaluationCriteria, setEvaluationCriteria] = useState(['examenes', 'tareas', 'proyectos']);
  const [newCriterion, setNewCriterion] = useState('');
  const [selectedMateria, setSelectedMateria] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [selectedTrimestre, setSelectedTrimestre] = useState('Trimestre 1');
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [manualEscuelaId, setManualEscuelaId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [calificacionesHistorial, setCalificacionesHistorial] = useState([]);
  const [periodType, setPeriodType] = useState('Trimestral');
  const [periodCount, setPeriodCount] = useState(3);

  const navigate = useNavigate();
  const location = useLocation();
  const escuelaIdFromUrl = new URLSearchParams(location.search).get('escuelaId');
  const escuelaId = escuelaIdFromUrl || manualEscuelaId;

  const periodOptions = Array.from({ length: periodCount }, (_, i) => `${periodType === 'Trimestral' ? 'Trimestre' : 'Semestre'} ${i + 1}`);

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
        const initialGrades = {};
        alumnosData.forEach((alumno) => {
          initialGrades[alumno.id] = {};
          evaluationCriteria.forEach((criterion) => {
            initialGrades[alumno.id][criterion] = 0;
          });
        });
        setGrades(initialGrades);
      }

      const { data: materiasData, error: materiasError } = await supabase
        .from('materias')
        .select('*')
        .eq('escuela_id', escuelaId);

      if (materiasError) {
        console.error('Error fetching materias:', materiasError);
        setErrorMessage('Error al cargar las materias: ' + materiasError.message);
      } else {
        setMaterias(materiasData || []);
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
        setErrorMessage('Error al cargar el historial de calificaciones: ' + calificacionesError.message);
      } else {
        const filteredCalificaciones = calificacionesData.filter((calificacion) =>
          alumnos.some((alumno) => alumno.id === calificacion.alumno_id && alumno.escuela_id === escuelaId)
        );
        setCalificacionesHistorial(filteredCalificaciones || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [escuelaId, navigate, evaluationCriteria]);

  useEffect(() => {
    const filtered = alumnos.filter((alumno) => {
      const fullName = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.toLowerCase();
      const numeroMatricula = alumno.numero_matricula?.toLowerCase() || '';
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || numeroMatricula.includes(searchTerm.toLowerCase());
      const matchesGrupo = !selectedGrupo || alumno.grupo === selectedGrupo;
      return matchesSearch && matchesGrupo;
    });
    setFilteredAlumnos(filtered);
  }, [searchTerm, selectedGrupo, alumnos]);

  const handleCreateMateria = async (e) => {
    e.preventDefault();
    if (!newMateria.trim()) {
      setErrorMessage('El nombre de la materia no puede estar vacío.');
      return;
    }

    if (!escuelaId) {
      setErrorMessage('No se proporcionó un ID de escuela válido para crear la materia.');
      return;
    }

    const { data, error } = await supabase
      .from('materias')
      .insert({ nombre: newMateria, escuela_id: escuelaId })
      .select();

    if (error) {
      console.error('Error creating materia:', error);
      setErrorMessage('Error al crear la materia: ' + error.message);
    } else {
      setMaterias((prev) => [...prev, ...data]);
      setNewMateria('');
      setErrorMessage(null);
    }
  };

  const handleRemoveMateria = async (materiaId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta materia? Esto no eliminará las calificaciones asociadas, pero no podrás registrar más en ella.')) {
      return;
    }

    const { error } = await supabase
      .from('materias')
      .delete()
      .eq('id', materiaId)
      .eq('escuela_id', escuelaId);

    if (error) {
      console.error('Error removing materia:', error);
      setErrorMessage('Error al eliminar la materia: ' + error.message);
    } else {
      setMaterias((prev) => prev.filter((m) => m.id !== materiaId));
      if (selectedMateria === prev.find((m) => m.id === materiaId)?.nombre) {
        setSelectedMateria('');
      }
    }
  };

  const handleAddCriterion = (e) => {
    e.preventDefault();
    if (newCriterion.trim() && !evaluationCriteria.includes(newCriterion.trim().toLowerCase())) {
      setEvaluationCriteria((prev) => [...prev, newCriterion.trim().toLowerCase()]);
      setPercentages((prev) => ({ ...prev, [newCriterion.trimIOC().toLowerCase()]: 0 }));
      setNewCriterion('');
      const updatedGrades = { ...grades };
      alumnos.forEach((alumno) => {
        updatedGrades[alumno.id] = { ...updatedGrades[alumno.id], [newCriterion.trim().toLowerCase()]: 0 };
      });
      setGrades(updatedGrades);
    }
  };

  const handleRemoveCriterion = (criterion) => {
    setEvaluationCriteria((prev) => prev.filter((c) => c !== criterion));
    setPercentages((prev) => {
      const { [criterion]: _, ...rest } = prev;
      return rest;
    });
    const updatedGrades = { ...grades };
    alumnos.forEach((alumno) => {
      const { [criterion]: _, ...restGrades } = updatedGrades[alumno.id] || {};
      updatedGrades[alumno.id] = restGrades;
    });
    setGrades(updatedGrades);
  };

  const handleGradeChange = (alumnoId, category, value) => {
    setGrades((prev) => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], [category]: value },
    }));
  };

  const handlePercentageChange = (category, value) => {
    setPercentages((prev) => {
      const total = Object.values({ ...prev, [category]: value }).reduce((sum, val) => sum + val, 0);
      if (total <= 100) return { ...prev, [category]: value };
      return prev;
    });
  };

  const handleCommentChange = (alumnoId, value) => {
    setComments((prev) => ({ ...prev, [alumnoId]: value }));
  };

  const calculateAverage = (alumnoId) => {
    const alumnoGrades = grades[alumnoId] || {};
    const total = evaluationCriteria.reduce((sum, category) => {
      const grade = alumnoGrades[category] || 0;
      const percentage = percentages[category] || 0;
      return sum + (grade * percentage) / 100;
    }, 0);
    return total.toFixed(2);
  };

  const handleSave = async () => {
    try {
      if (!selectedMateria) {
        setErrorMessage('Por favor, selecciona una materia antes de guardar las calificaciones.');
        return;
      }

      const gradesData = filteredAlumnos
        .map((alumno) => {
          const gradeEntries = evaluationCriteria.map((category) => ({
            id: crypto.randomUUID(),
            alumno_id: alumno.id,
            materia: selectedMateria,
            periodo: selectedTrimestre,
            tipo_evaluacion: category,
            calificacion: grades[alumno.id]?.[category] || 0,
            comentarios: comments[alumno.id] || '',
            creado_por: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            examen_id: null,
          }));
          return gradeEntries;
        })
        .flat();

      const { data, error } = await supabase.from('calificaciones').upsert(gradesData).select();
      if (error) throw error;

      const { data: updatedCalificaciones, error: calificacionesError } = await supabase
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
        console.error('Error al actualizar el historial:', calificacionesError);
      } else {
        const filteredCalificaciones = updatedCalificaciones.filter((calificacion) =>
          alumnos.some((alumno) => alumno.id === calificacion.alumno_id && alumno.escuela_id === escuelaId)
        );
        setCalificacionesHistorial(filteredCalificaciones || []);
      }

      alert('Calificaciones guardadas exitosamente!');
    } catch (error) {
      console.error('Error saving grades:', error.message);
      setErrorMessage('Error al guardar las calificaciones: ' + error.message);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = '#1E3A8A';
    const secondaryColor = '#4B5563';
    const accentColor = '#E5E7EB';

    doc.setFont('helvetica', 'normal');

    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.text('Reporte de Calificaciones', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(
      `${selectedGrupo || 'Todos los grupos'} - ${selectedMateria || 'Sin materia seleccionada'}`,
      20,
      30
    );

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 38);
    doc.text(`Escuela ID: ${escuelaId || 'N/A'}`, 20, 44);

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);

    const tableData = filteredAlumnos.map((alumno, index) => {
      return [
        index + 1,
        `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
        ...evaluationCriteria.map((category) => grades[alumno.id]?.[category] || '0'),
        calculateAverage(alumno.id),
        comments[alumno.id] || 'Sin comentario',
      ];
    });

    const columns = [
      '#',
      'Alumno',
      ...evaluationCriteria.map((category) => category.charAt(0).toUpperCase() + category.slice(1)),
      'Promedio',
      'Comentario',
    ];

    doc.autoTable({
      startY: 60,
      head: [columns],
      body: tableData,
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        textColor: secondaryColor,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: '#FFFFFF',
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: accentColor,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        [columns.length - 1]: { cellWidth: 50 },
      },
      margin: { top: 60, left: 20, right: 20 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(secondaryColor);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      },
    });

    doc.save(`calificaciones_${selectedGrupo || 'todos'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const wsData = filteredAlumnos.map((alumno, index) => {
      const row = {
        '#': index + 1,
        Nombre: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`,
        Promedio: calculateAverage(alumno.id),
        Comentario: comments[alumno.id] || 'Sin comentario',
      };
      evaluationCriteria.forEach((category) => {
        row[category] = grades[alumno.id]?.[category] || 0;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
    XLSX.writeFile(wb, `calificaciones_${selectedGrupo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Registro de Calificaciones</h2>
        <div className="bg-white shadow-lg rounded-lg p-6">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
              {errorMessage}
            </div>
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
                className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Configurar Periodos</h3>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Periodo:
                </label>
                <select
                  value={periodType}
                  onChange={(e) => {
                    setPeriodType(e.target.value);
                    setSelectedTrimestre(`${e.target.value === 'Trimestral' ? 'Trimestre' : 'Semestre'} 1`);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Periodos:
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={periodCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    setPeriodCount(count);
                    setSelectedTrimestre(`${periodType === 'Trimestral' ? 'Trimestre' : 'Semestre'} 1`);
                  }}
                  className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Porcentajes por Categoría</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {evaluationCriteria.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-600 capitalize">
                    {category}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentages[category] || 0}
                    onChange={(e) => handlePercentageChange(category, parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">%</span>
                  <button
                    onClick={() => handleRemoveCriterion(category)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Total: {Object.values(percentages).reduce((sum, val) => sum + val, 0)}%
            </p>
            <form onSubmit={handleAddCriterion} className="mt-4 flex flex-col sm:flex-row sm:space-x-2 space-y-4 sm:space-y-0">
              <input
                type="text"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                placeholder="Nuevo criterio (ej: participacion)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Agregar
              </button>
            </form>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Crear/Eliminar Materia</h3>
            <form onSubmit={handleCreateMateria} className="flex flex-col sm:flex-row sm:space-x-2 space-y-4 sm:space-y-0 mb-4">
              <input
                type="text"
                value={newMateria}
                onChange={(e) => setNewMateria(e.target.value)}
                placeholder="Nombre de la materia"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Crear
              </button>
            </form>
            <div className="flex flex-wrap gap-3">
              {materias.map((materia) => (
                <div key={materia.id} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{materia.nombre}</span>
                  <button
                    onClick={() => handleRemoveMateria(materia.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por Nombre o Matrícula:
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupo:
                </label>
                <select
                  value={selectedGrupo}
                  onChange={(e) => setSelectedGrupo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los grupos</option>
                  {[...new Set(alumnos.map((a) => a.grupo))].map((grupo) => (
                    <option key={grupo} value={grupo}>{grupo || 'Sin grupo'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Materia:
                </label>
                <select
                  value={selectedMateria}
                  onChange={(e) => setSelectedMateria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una materia</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.nombre}>{materia.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Periodo:
                </label>
                <select
                  value={selectedTrimestre}
                  onChange={(e) => setSelectedTrimestre(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {periodOptions.map((period) => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Calificaciones</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow-md">
                <thead className="bg-blue-600 text-white sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold">Número de Matrícula</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold">Alumno</th>
                    {evaluationCriteria.map((category) => (
                      <th key={category} className="py-3 px-4 text-left text-sm font-semibold">
                        {category} (0-10)
                      </th>
                    ))}
                    <th className="py-3 px-4 text-left text-sm font-semibold">Promedio</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold">Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlumnos.length === 0 ? (
                    <tr>
                      <td colSpan={5 + evaluationCriteria.length} className="py-4 px-4 text-center text-gray-500">
                        No hay alumnos para mostrar. Verifica los filtros o asegúrate de que haya alumnos registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredAlumnos.map((alumno) => (
                      <tr key={alumno.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">{alumno.numero_matricula || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`}</td>
                        {evaluationCriteria.map((category) => (
                          <td key={category} className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={grades[alumno.id]?.[category] || 0}
                              onChange={(e) => handleGradeChange(alumno.id, category, parseFloat(e.target.value) || 0)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        ))}
                        <td className="py-3 px-4 text-sm text-gray-700">{calculateAverage(alumno.id)}</td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={comments[alumno.id] || ''}
                            onChange={(e) => handleCommentChange(alumno.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Guardar
            </button>
            <button
              onClick={exportToPDF}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Exportar a PDF
            </button>
            <button
              onClick={exportToExcel}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Exportar a Excel
            </button>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Historial de Calificaciones</h3>
            {calificacionesHistorial.length === 0 ? (
              <p className="text-sm text-gray-500">No hay calificaciones registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow-md">
                  <thead className="bg-blue-600 text-white sticky top-0">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Número de Matrícula</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Alumno</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Materia</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Periodo</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Tipo de Evaluación</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Calificación</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Comentarios</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Creado Por</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calificacionesHistorial.map((calificacion) => (
                      <tr key={calificacion.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.alumnos?.numero_matricula || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{`${calificacion.alumnos?.nombre || ''} ${calificacion.alumnos?.apellido_paterno || ''} ${calificacion.alumnos?.apellido_materno || ''}`}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.materia}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.periodo}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.tipo_evaluacion}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.calificacion}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.comentarios || 'Sin comentario'}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{calificacion.creado_por}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{new Date(calificacion.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calificaciones;