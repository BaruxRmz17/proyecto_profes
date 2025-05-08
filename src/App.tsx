import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/layout/user/Navbar";
import AdminNavbar from "./components/layout/admin/NavbarA";; // Importa navbar de admin
import Footer from "./components/layout/user/footer";

import "./index.css";
import supabase from "./services/supabase";

import UserLogin from "./pages/Login";
import VerifyCode from "./pages/CodigoVerificacion";
import Register from "./pages/Registrate";
import CreateSchoolDashboard from "./pages/CrearEscuela";
import UserDashboard from "./pages/DashboardEscuelas";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Escuelas from "./pages/admin/Escuelas";
import Codigos from "./pages/admin/Codigos";
import Usuarios from "./pages/admin/Usuarios";

const App: React.FC = () => {
  return (
    <Router>
      <Layout />
    </Router>
  );
};

const Layout: React.FC = () => {
  const location = useLocation();

  // Rutas donde no se muestra ninguna navbar ni footer
  const hideNavbarFooter = ["/", "/verificar-codigo", "/admin/login"].includes(location.pathname);

  // Detecta si estás en una ruta de admin (excepto el login de admin)
  const isAdminRoute = location.pathname.startsWith("/admin") && location.pathname !== "/admin/login";

  return (
    <>
      {!hideNavbarFooter && (isAdminRoute ? <AdminNavbar /> : <Navbar />)}
      <div className={hideNavbarFooter ? "" : "pt-4 min-h-screen bg-gray-50"}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<UserLogin />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/verificar-codigo" element={<VerifyCode />} />
          <Route path="/registrate" element={<Register />} />
          <Route path="/crearE" element={<CreateSchoolDashboard />} />
          <Route path="/homeU" element={<UserDashboard />} />



          {/* Rutas de admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/home" element={<AdminDashboard />} />
          <Route path="/admin/escuelas" element={<Escuelas />} />
          <Route path="/admin/codigos" element={<Codigos />} />
          <Route path="/admin/usuarios" element={<Usuarios />} />



        </Routes>
      </div>
      {!hideNavbarFooter && <Footer />}
    </>
  );
};

export default App;
