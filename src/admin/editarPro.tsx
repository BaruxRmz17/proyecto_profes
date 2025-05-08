import React, { useState, useEffect, FormEvent } from 'react';
import supabase from '../services/supabase';
import { useNavigate } from 'react-router-dom';

type Property = {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  moneda: 'MXN' | 'USD';
  ubicacion: string;
  google_maps_link: string;
  tipo: 'venta' | 'renta';
  categoria: 'casa' | 'terreno';
  id_vendedor: string;
  imagenes?: string[];
  videos?: string[];
};

const EditarPro: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [formData, setFormData] = useState<Property | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideos, setNewVideos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase.from('propiedades').select('*');
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
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      const selectedProperty = properties.find(prop => prop.id === selectedPropertyId);
      if (selectedProperty) {
        // Asegurarse de que descripción sea una cadena vacía si es null
        setFormData({ ...selectedProperty, descripcion: selectedProperty.descripcion || '' });
        setNewImages([]);
        setNewVideos([]);
      }
    } else {
      setFormData(null);
    }
  }, [selectedPropertyId, properties]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => (prev ? { ...prev, [name]: name === 'precio' ? Number(value) : value } : null));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (type === 'images') {
      setNewImages(files);
    } else {
      setNewVideos(files);
    }
  };

  const handleRemoveMedia = (index: number, type: 'imagenes' | 'videos') => {
    if (!formData) return;
    const updatedMedia = formData[type]?.filter((_, i) => i !== index);
    setFormData(prev => (prev ? { ...prev, [type]: updatedMedia } : null));
  };

  const uploadFiles = async (files: File[], folder: string) => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError, data } = await supabase.storage
        .from('propiedades-media')
        .upload(`${folder}/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage
        .from('propiedades-media')
        .getPublicUrl(`${folder}/${fileName}`);
      uploadedUrls.push(publicUrlData.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData || !selectedPropertyId) {
      alert('Por favor, selecciona una propiedad primero');
      return;
    }
    setLoading(true);
    try {
      let updatedFormData = { ...formData };

      if (newImages.length > 0) {
        const imageUrls = await uploadFiles(newImages, 'images');
        updatedFormData.imagenes = [...(formData.imagenes || []), ...imageUrls];
      }

      if (newVideos.length > 0) {
        const videoUrls = await uploadFiles(newVideos, 'videos');
        updatedFormData.videos = [...(formData.videos || []), ...videoUrls];
      }

      const { error } = await supabase
        .from('propiedades')
        .update(updatedFormData)
        .eq('id', selectedPropertyId);
      if (error) throw error;

      alert('Propiedad actualizada con éxito!');
      navigate('/HomeAdmin');
    } catch (error) {
      console.error('Error actualizando propiedad:', error);
      alert('Hubo un error al actualizar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center p-6">Cargando propiedades...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Editar Propiedad</h2>
      <button
        onClick={() => navigate('/HomeAdmin')}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Home
      </button>
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
              {property.titulo} - {property.ubicacion}
            </option>
          ))}
        </select>
      </div>
      {formData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Moneda</label>
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="MXN">Pesos Mexicanos (MXN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Título</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo || ''} // Asegurarse de que no sea null
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion || ''} // Asegurarse de que no sea null
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>
          <div>
            <label className="block mb-1">Precio</label>
            <input
              type="number"
              name="precio"
              value={formData.precio ?? ''} // Convertir null/undefined a cadena vacía
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block mb-1">Ubicación</label>
            <input
              type="text"
              name="ubicacion"
              value={formData.ubicacion || ''} // Asegurarse de que no sea null
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Enlace de Google Maps</label>
            <input
              type="url"
              name="google_maps_link"
              value={formData.google_maps_link || ''} // Asegurarse de que no sea null
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Tipo</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="venta">Venta</option>
              <option value="renta">Renta</option>
            </select>
          </div>

          {/* Editar Imágenes Existentes */}
          <div>
            <label className="block mb-1">Imágenes Actuales</label>
            {formData.imagenes && formData.imagenes.length > 0 ? (
              <ul className="space-y-2">
                {formData.imagenes.map((url, index) => (
                  <li key={index} className="flex items-center">
                    <img src={url} alt={`Imagen ${index}`} className="w-20 h-20 object-cover mr-2" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index, 'imagenes')}
                      className="text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay imágenes.</p>
            )}
          </div>

          {/* Subir Nuevas Imágenes */}
          <div>
            <label className="block mb-1">Agregar Nuevas Imágenes</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'images')}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Editar Videos Existentes */}
          <div>
            <label className="block mb-1">Videos Actuales</label>
            {formData.videos && formData.videos.length > 0 ? (
              <ul className="space-y-2">
                {formData.videos.map((url, index) => (
                  <li key={index} className="flex items-center">
                    <video src={url} className="w-20 h-20 object-cover mr-2" controls />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index, 'videos')}
                      className="text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay videos.</p>
            )}
          </div>

          {/* Subir Nuevos Videos */}
          <div>
            <label className="block mb-1">Agregar Nuevos Videos</label>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={(e) => handleFileChange(e, 'videos')}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Guardando...' : 'Actualizar Propiedad'}
          </button>
        </form>
      ) : (
        <p className="text-gray-600">Selecciona una propiedad para editar sus detalles.</p>
      )}
    </div>
  );
};

export default EditarPro;