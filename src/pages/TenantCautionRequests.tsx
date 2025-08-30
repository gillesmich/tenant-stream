import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Euro, Calendar, MapPin, Shield, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface CautionRequest {
  id: string;
  tenant_email: string;
  tenant_phone: string;
  amount: number;
  duration_months: number;
  property_address: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const TenantCautionRequests = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CautionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCautionRequests();
    }
  }, [user]);

  const loadCautionRequests = async () => {
    if (!user) return;

    try {
      console.log('Loading caution requests for tenant user:', user.id);
      
      // Get the user's profile to find their email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      
      console.log('User profile email:', profile.email);

      // Load caution requests for this email
      const { data, error } = await supabase
        .from("caution_requests")
        .select("*")
        .eq("tenant_email", profile.email)
        .order("created_at", { ascending: false });

      console.log('Caution requests query result:', { data, error });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading caution requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes de caution",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      invited: "secondary",
      accepted: "default",
      paid: "default",
      expired: "destructive",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      invited: "Invité",
      accepted: "Accepté",
      paid: "Payé",
      expired: "Expiré",
      cancelled: "Annulé",
    };

    const icons = {
      pending: Clock,
      invited: AlertCircle,
      accepted: CheckCircle,
      paid: CheckCircle,
      expired: AlertCircle,
      cancelled: AlertCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {labels[status] || status}
      </Badge>
    );
  };

  if (userRole !== "locataire") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Cette page est réservée aux locataires.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Mes demandes de caution
          </h1>
          <p className="text-muted-foreground">
            Consultez vos demandes de caution locative
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-12 text-center">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucune demande de caution</h3>
                  <p className="text-muted-foreground">
                    Vos demandes de caution apparaîtront ici lorsque vous en recevrez.
                  </p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Euro className="h-5 w-5" />
                          {(request.amount / 100).toLocaleString('fr-FR')} €
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4" />
                          {request.property_address}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.duration_months} mois</span>
                      </div>
                    </div>
                    <div className="mb-4 text-xs text-muted-foreground">
                      Créé le {new Date(request.created_at).toLocaleDateString('fr-FR')} •
                      Expire le {new Date(request.expires_at).toLocaleDateString('fr-FR')}
                    </div>
                    
                    {(request.status === 'pending' || request.status === 'invited') && (
                      <Button 
                        asChild
                        className="w-full"
                      >
                        <Link to={`/caution-invitation/${request.id}`}>
                          Voir l'invitation
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantCautionRequests;