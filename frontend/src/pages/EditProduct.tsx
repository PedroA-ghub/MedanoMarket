import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { productService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, X, ArrowLeft, Loader2, ImagePlus } from 'lucide-react';
import type { AxiosError } from 'axios';
import Layout from '../components/Layout';

interface ExistingImage {
  id: number;
  image_url: string;
}

interface NewImagePreview {
  file: File;
  preview: string;
}

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [location, setLocation] = useState('');
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImages, setNewImages] = useState<NewImagePreview[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const product = await productService.get(parseInt(id));
        setName(product.name);
        setDescription(product.description);
        setPrice(product.price);
        setStock(String(product.stock));
        setLocation(product.location || '');
        if (product.images && product.images.length > 0) {
          setExistingImages(product.images.map((img: { id: number; image_url: string }) => ({
            id: img.id,
            image_url: img.image_url,
          })));
        } else if (product.image_url) {
          setExistingImages([{ id: -1, image_url: product.image_url }]);
        }
      } catch {
        setError('No se pudo cargar el producto');
      } finally {
        setFetching(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setStock(value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const totalCount = existingImages.length - removedImageIds.length + newImages.length;
      const newPreviews: NewImagePreview[] = [];
      for (let i = 0; i < files.length; i++) {
        if (totalCount + newPreviews.length >= 3) break;
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push({ file, preview: reader.result as string });
          if (newPreviews.length === Math.min(files.length, 3 - totalCount)) {
            setNewImages(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveExistingImage = (imgId: number) => {
    if (imgId === -1) {
      setExistingImages([]);
    } else {
      setRemovedImageIds(prev => [...prev, imgId]);
      setExistingImages(prev => prev.filter(img => img.id !== imgId));
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user || !id) {
      navigate('/login');
      return;
    }

    if (!name || !description || !price || !stock) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('stock', stock);
      if (location) formData.append('location', location);
      newImages.forEach((img) => {
        formData.append('images', img.file);
      });
      removedImageIds.forEach((imgId) => {
        formData.append('remove_images', String(imgId));
      });

      await productService.update(parseInt(id), formData);
      navigate(`/product/${id}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string; error?: string }>;
      setError(axiosError.response?.data?.detail || axiosError.response?.data?.error || 'Error al actualizar el producto');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <Package className="w-16 h-16 text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Inicia sesión para editar productos</h2>
          <Link to="/login" className="btn-primary">
            Iniciar sesión
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showSearch>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/product/${id}`} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-teal-400" />
            Editar Producto
          </h1>
        </div>

        <div className="card p-6 md:p-8 animate-fade-in">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Nombre del producto *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Ej: iPhone 13 Pro Max"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Descripcion *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input h-32 resize-none"
                placeholder="Describe las características de tu producto..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Precio ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Stock (unidades) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={stock}
                  onChange={handleStockChange}
                  className="input"
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Ubicación (opcional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="Ej: Santo Domingo, RD"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Imágenes del producto (máximo 3, opcionales)
              </label>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.image_url}
                        alt="Existing"
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(img.id)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {newImages.map((img, index) => (
                    <div key={`new-${index}`} className="relative">
                      <img
                        src={img.preview}
                        alt={`New ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(index)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded-full">
                        Nueva
                      </span>
                    </div>
                  ))}
                  {(existingImages.length + newImages.length) < 3 && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl hover:bg-white/5 transition-colors">
                        <ImagePlus className="w-6 h-6 text-zinc-400" />
                        <span className="text-xs text-zinc-400 mt-1">
                          {existingImages.length + newImages.length === 0 ? 'Agregar' : `+${3 - existingImages.length - newImages.length}`}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {(existingImages.length + newImages.length) >= 3 && (
                  <p className="text-xs text-zinc-500">Máximo de imágenes alcanzado (3)</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Package className="w-5 h-5" />
                    Guardar Cambios
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/product/${id}`)}
                className="btn-secondary px-6"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
