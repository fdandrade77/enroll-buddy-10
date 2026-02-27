import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import { VendedorLayout } from "@/components/VendedorLayout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVendedores from "./pages/admin/AdminVendedores";
import AdminCursos from "./pages/admin/AdminCursos";
import VendedorDashboard from "./pages/vendedor/VendedorDashboard";
import PublicMatricula from "./pages/PublicMatricula";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/r/:codigo" element={<PublicMatricula />} />

            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="vendedores" element={<AdminVendedores />} />
              <Route path="cursos" element={<AdminCursos />} />
            </Route>

            <Route path="/vendedor" element={<ProtectedRoute requiredRole="vendedor"><VendedorLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<VendedorDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
