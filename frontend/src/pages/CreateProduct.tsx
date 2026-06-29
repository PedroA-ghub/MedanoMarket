import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productService, exchangeRateService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, X, ArrowLeft, ImagePlus } from 'lucide-react';
import type { AxiosError } from 'axios';
import Layout from '../components/Layout';
import { formatPrice } from '../utils';

interface ImagePreview {
  file: File;
  preview: string;
}

export default function CreateProduct() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadRate = async () => {
      try {
        const data = await exchangeRateService.getRate();
        if (data.rate) setExchangeRate(data.rate);
      } catch {
        // Rate might not be set
      }
    };
    loadRate();
  }, []);

  const priceBs = price && exchangeRate ? (parseFloat(price) * parseFloat(exchangeRate)).toFixed(2) : null;

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setStock(value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: ImagePreview[] = [];
      for (let i = 0; i < files.length; i++) {
        if (images.length + newImages.length >= 3) break;
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push({ file, preview: reader.result as string });
          if (newImages.length === Math.min(files.length, 3 - images.length)) {
            setImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
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
      images.forEach((img) => {
        formData.append('images', img.file);
      });

      await productService.create(formData);
      navigate('/search');
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string; error?: string }>;
      setError(axiosError.response?.data?.detail || axiosError.response?.data?.error || 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <Package className="w-16 h-16 text-zinc-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Inicia sesión para crear productos</h2>
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
          <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-teal-400" />
            Crear Nuevo Producto
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
                placeholder="Ej: Café molido 500g"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Descripción *
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
                {priceBs && (
                  <p className="text-sm text-zinc-500 mt-1">
                    Bs {formatPrice(priceBs)}
                  </p>
                )}
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
                placeholder="Ej: Mercado Municipal, San Fernando. Apure"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Imágenes del producto (máximo 3, opcionales)
              </label>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                  {images.length < 3 && (
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
                          {images.length === 0 ? 'Agregar' : `+${3 - images.length}`}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {images.length >= 3 && (
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
                    Crear Producto
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
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
