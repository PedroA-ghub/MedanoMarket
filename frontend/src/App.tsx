import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import Search from './pages/Search';
import CreateProduct from './pages/CreateProduct';
import EditProduct from './pages/EditProduct';
import EditProfile from './pages/EditProfile';
import Chat from './pages/Chat';
import Wishlist from './pages/Wishlist';
import Cart from './pages/Cart';
import ProductDetail from './pages/ProductDetail';
import ProUpgrade from './pages/ProUpgrade';
import ProDashboard from './pages/ProDashboard';
import CompleteProfile from './pages/CompleteProfile';
import SellerProfile from './pages/SellerProfile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/search" element={<Search />} />
          <Route path="/create-product" element={<CreateProduct />} />
          <Route path="/product/:id/edit" element={<EditProduct />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/chat/:orderId" element={<Chat />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/pro/upgrade" element={<ProUpgrade />} />
          <Route path="/pro/dashboard" element={<ProDashboard />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
