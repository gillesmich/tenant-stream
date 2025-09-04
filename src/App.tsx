import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Properties from "./pages/Properties";
import Leases from "./pages/Leases";
import Rents from "./pages/Rents";
import Tenants from "./pages/Tenants";
import Documents from "./pages/Documents";
import Inventories from "./pages/Inventories";
import CautionRequests from "./pages/CautionRequests";
import CautionInvitation from "./pages/CautionInvitation";
import TenantCautionRequests from "./pages/TenantCautionRequests";
import TenantDashboard from "./pages/TenantDashboard";
import NotFound from "./pages/NotFound";
import { CommandPalette } from "./components/CommandPalette";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CommandPalette />
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/properties" element={
              <ProtectedRoute>
                <Properties />
              </ProtectedRoute>
            } />
            <Route path="/leases" element={
              <ProtectedRoute>
                <Leases />
              </ProtectedRoute>
            } />
            <Route path="/rents" element={
              <ProtectedRoute>
                <Rents />
              </ProtectedRoute>
            } />
            <Route path="/tenants" element={
              <ProtectedRoute>
                <Tenants />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } />
            <Route path="/inventories" element={
              <ProtectedRoute>
                <Inventories />
              </ProtectedRoute>
            } />
            <Route path="/cautions" element={
              <ProtectedRoute>
                <CautionRequests />
              </ProtectedRoute>
            } />
            <Route path="/caution-invitation/:id" element={<CautionInvitation />} />
            <Route path="/tenant-dashboard" element={
              <ProtectedRoute>
                <TenantDashboard />
              </ProtectedRoute>
            } />
            <Route path="/tenant/payments" element={
              <ProtectedRoute>
                <Rents />
              </ProtectedRoute>
            } />
            <Route path="/tenant/cautions" element={
              <ProtectedRoute>
                <TenantCautionRequests />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
