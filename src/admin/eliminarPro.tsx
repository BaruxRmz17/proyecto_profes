import React, { useState, useEffect, FormEvent } from 'react';
import supabase from '../services/supabase'; // Asegúrate de que la ruta sea correcta
import { useNavigate } from 'react-router-dom';

// Definición de la interfaz Property
type Property = {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  ubicacion: string;
  tipo: 'venta' | 'renta';
  categoria: string;
  id_vendedor: string;
  imagenes?: string[];
  created_at?: string;
};

const EliminarPro: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Cargar todas las propiedades al montar el componente
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('propiedades')
          .select('*');

        if (error) throw error;

        setProperties(data || []);
      } catch (error) {
        console.error('Error cargando propiedades:', error);
        alert('Hubo un error al cargar las propiedades');
      } finally {
        setFetching(false);
      }
    };

    fetchProperties();
    window.scrollTo(0, 0);

  }, []);

  // Actualizar la propiedad seleccionada para mostrar detalles
  useEffect(() => {
    if (selectedPropertyId) {
      const property = properties.find(prop => prop.id === selectedPropertyId);
      setSelectedProperty(property || null);
    } else {
      setSelectedProperty(null); // Limpiar si no hay selección
    }
  }, [selectedPropertyId, properties]);

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      alert('Por favor, selecciona una propiedad primero');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar "${selectedProperty?.titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('propiedades')
        .delete()
        .eq('id', selectedPropertyId);

      if (error) throw error;

      // Actualizar la lista de propiedades después de eliminar
      setProperties(prev => prev.filter(prop => prop.id !== selectedPropertyId));
      setSelectedPropertyId('');
      alert('Propiedad eliminada con éxito!');
    } catch (error) {
      console.error('Error eliminando propiedad:', error);
      alert('Hubo un error al eliminar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center p-6">Cargando propiedades...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Eliminar Propiedad</h2>
      <button
        onClick={() => navigate('/HomeAdmin')}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Home
      </button>

      {/* Selector de propiedades */}
      <div className="mb-6">
        <label className="block mb-1">Selecciona una propiedad</label>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Selecciona una propiedad --</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.titulo} - {property.ubicacion} ({property.categoria})
            </option>
          ))}
        </select>
      </div>

      {/* Detalles de la propiedad seleccionada y botón de eliminar */}
      {selectedProperty ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Detalles de la propiedad</h3>
            <p><strong>Título:</strong> {selectedProperty.titulo}</p>
            <p><strong>Descripción:</strong> {selectedProperty.descripcion || 'Sin descripción'}</p>
            <p><strong>Precio:</strong> ${selectedProperty.precio}</p>
            <p><strong>Ubicación:</strong> {selectedProperty.ubicacion}</p>
            <p><strong>Tipo:</strong> {selectedProperty.tipo}</p>
            <p><strong>Categoría:</strong> {selectedProperty.categoria}</p>
          </div>
          <form onSubmit={handleDelete}>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {loading ? 'Eliminando...' : 'Eliminar Propiedad'}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-gray-600">Selecciona una propiedad para ver sus detalles y eliminarla.</p>
      )}
    </div>
  );
};

export default EliminarPro;
