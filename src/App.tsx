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
import UserDashboard from "./pages/DashboardU";
import CreateAlumnos from "./pages/Alumnos";
import ExamGenerator from "./pages/GExamenes";
import LessonPlanGenerator from "./pages/GPlaneaciones";
import GradeRegistration from "./pages/Calificaciones";
import ReportesDesempeno from "./pages/ReportesD";
import EstadisticasGrupales from "./pages/RGrupales";
import Boletas from "./pages/Boletas";
import ControlAsistencia from "./pages/CAsistencia";
import Participacion from "./pages/Participacion";
import Comportamiento from "./pages/Comportamiento";
import EditarPerfil from "./pages/EPerfil";


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
  const hideNavbarFooter = ["/", "/verificar-codigo", "/admin/login", "/crearE"].includes(location.pathname);

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
          <Route path="/alumno" element={<CreateAlumnos />} />
          <Route path="/GExamenes" element={<ExamGenerator />} />
          <Route path="/GPlaneaciones" element={<LessonPlanGenerator />} />
          <Route path="/Calificaciones" element={<GradeRegistration />} />
          <Route path="/ReportesD" element={<ReportesDesempeno />} />
          <Route path="/RGrupales" element={<EstadisticasGrupales />} />
          <Route path="/Boletas" element={<Boletas />} />
          <Route path="/CAsistencia" element={<ControlAsistencia />} />
          <Route path="/Participacion" element={<Participacion />} />
          <Route path="/Comportamiento" element={<Comportamiento />} />
          <Route path="/EPerfil" element={<EditarPerfil />} />




          

          









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
