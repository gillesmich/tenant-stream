import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import LandlordDashboard from "./LandlordDashboard";
import TenantDashboard from "./TenantDashboard";
import Navigation from "@/components/ui/navigation";

const Index = () => {
  const { userRole, loading } = useAuth();

  // Show loading while determining user role
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  if (userRole === 'locataire') {
    return <TenantDashboard />;
  }

  // Default to landlord dashboard for 'proprietaire' or any other role
  return <LandlordDashboard />;
};

export default Index;
