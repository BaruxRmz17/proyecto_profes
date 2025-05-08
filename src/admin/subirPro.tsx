import React, { useState, FormEvent } from 'react';
import supabase from '../services/supabase';
import { useNavigate } from 'react-router-dom';

// Definición de la interfaz Property
type Property = {
  titulo: string;
  descripcion: string;
  precio: number;
  ubicacion: string;
  google_maps_link: string;
  moneda: 'MXN' | 'USD';
  tipo: 'venta' | 'renta';
  categoria: 'casa' | 'terreno';
  id_vendedor: string;
};

const PropertyForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Property>({
    titulo: '',
    descripcion: '',
    precio: 0,
    ubicacion: '',
    google_maps_link: '',
    moneda: 'MXN',
    tipo: 'venta',
    categoria: 'casa',
    id_vendedor: 'ecfa56f7-f29b-406b-9787-037d6db9473d', // ID de prueba, reemplázalo dinámicamente
  });

  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Manejo de cambios en los inputs del formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'precio' ? Number(value) : value
    }));
  };

  // Manejo de subida de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFunction: (files: File[]) => void) => {
    if (e.target.files) {
      setFunction(Array.from(e.target.files));
    }
  };

  // Función para subir archivos a Supabase
  const uploadFiles = async (files: File[], bucket: string): Promise<string[]> => {
    const fileUrls: string[] = [];
    
    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file);

      if (error) throw error;
      
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      fileUrls.push(publicData.publicUrl);
    }

    return fileUrls;
  };

  // Manejo del envío del formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrls: string[] = [];
      let videoUrls: string[] = [];

      if (images.length > 0) {
        imageUrls = await uploadFiles(images, 'propiedades'); // Subir imágenes
      }

      if (videos.length > 0) {
        videoUrls = await uploadFiles(videos, 'propiedades'); // Subir videos
      }

      const { error } = await supabase
        .from('propiedades')
        .insert([{ ...formData, imagenes: imageUrls, videos: videoUrls }]);

      if (error) throw error;
      
      alert('Propiedad creada con éxito!');
      navigate('/HomeAdmin');
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al crear la propiedad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Nueva Propiedad</h2>
      <button 
        onClick={() => navigate('/HomeAdmin')} 
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Home
      </button>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label className="block mb-1">Título</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            rows={4}
          />
        </div>

        {/* Precio */}
        <div>
          <label className="block mb-1">Precio</label>
          <input
            type="number"
            name="precio"
            value={formData.precio}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            required
            min="0"
          />
        </div>

        {/* Moneda */}
        <div>
          <label className="block mb-1">Moneda</label>
          <select
            name="moneda"
            value={formData.moneda}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          >
            <option value="MXN">Pesos MXN</option>
            <option value="USD">Dólares USD</option>
          </select>
        </div>

        {/* Ubicación */}
        <div>
          <label className="block mb-1">Ubicación</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Google Maps Link */}
        <div>
          <label className="block mb-1">Google Maps Link</label>
          <input
            type="text"
            name="google_maps_link"
            value={formData.google_maps_link}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Tipo */}
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

        {/* Categoría */}
        <div>
          <label className="block mb-1">Categoría</label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          >
            <option value="casa">Casa</option>
            <option value="terreno">Terreno</option>
          </select>
        </div>

        {/* Imágenes */}
        <div>
          <label className="block mb-1">Imágenes</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileChange(e, setImages)}
            className="w-full p-2"
          />
        </div>

        {/* Videos */}
        <div>
          <label className="block mb-1">Videos</label>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => handleFileChange(e, setVideos)}
            className="w-full p-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Guardando...' : 'Crear Propiedad'}
        </button>
      </form>
    </div>
  );
};

export default PropertyForm;
