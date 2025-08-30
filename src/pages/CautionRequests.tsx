import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Phone, Euro, Calendar, MapPin } from "lucide-react";
import Navigation from "@/components/ui/navigation";

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

const CautionRequests = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CautionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tenant_email: "",
    tenant_phone: "",
    amount: "",
    duration_months: "",
    property_address: "",
  });

  const [sendingId, setSendingId] = useState<string | null>(null);
  
  const sendInvitation = async (id: string) => {
    if (!user) return;
    try {
      setSendingId(id);
      console.log('Sending invitation for caution request:', id);
      const { data, error } = await supabase.functions.invoke('send-caution-invitation', {
        body: { cautionRequestId: id }
      });
      console.log('Edge function response:', { data, error });
      if (error) throw error;
      
      // Also copy invitation link to clipboard
      const invitationLink = `${window.location.origin}/caution-invitation/${id}`;
      navigator.clipboard.writeText(invitationLink);
      
      toast({ 
        title: "Invitation envoyée", 
        description: "Le locataire a été invité par email. Le lien d'invitation a été copié dans le presse-papiers."
      });
      await loadCautionRequests();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({ title: "Erreur", description: error.message || "Impossible d'envoyer l'invitation", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadCautionRequests();
    }
  }, [user]);

  const loadCautionRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("caution_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes de caution",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("caution_requests").insert({
        owner_id: user.id,
        tenant_email: formData.tenant_email,
        tenant_phone: formData.tenant_phone,
        amount: parseInt(formData.amount) * 100, // Convert to cents
        duration_months: parseInt(formData.duration_months),
        property_address: formData.property_address,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Demande de caution créée avec succès",
      });

      setIsDialogOpen(false);
      setFormData({
        tenant_email: "",
        tenant_phone: "",
        amount: "",
        duration_months: "",
        property_address: "",
      });
      loadCautionRequests();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      invited: "secondary",
      accepted: "default",
      rejected: "destructive",
      paid: "default",
      expired: "destructive",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      invited: "Invité",
      accepted: "Accepté",
      rejected: "Rejeté",
      paid: "Payé",
      expired: "Expiré",
      cancelled: "Annulé",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (userRole !== "proprietaire") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Cette page est réservée aux propriétaires.
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Demandes de Caution</h1>
            <p className="text-muted-foreground">
              Gérez vos demandes de caution locative
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Créer une demande de caution</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer une nouvelle demande de caution.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant_email">Email du locataire</Label>
                  <Input
                    id="tenant_email"
                    type="email"
                    value={formData.tenant_email}
                    onChange={(e) =>
                      setFormData({ ...formData, tenant_email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant_phone">Téléphone du locataire</Label>
                  <Input
                    id="tenant_phone"
                    type="tel"
                    value={formData.tenant_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, tenant_phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant de la caution (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Durée (mois)</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_months: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_address">Adresse du bien</Label>
                  <Textarea
                    id="property_address"
                    value={formData.property_address}
                    onChange={(e) =>
                      setFormData({ ...formData, property_address: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Créer la demande
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Aucune demande de caution trouvée.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
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
                        {request.status !== 'invited' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendInvitation(request.id)}
                            disabled={sendingId === request.id}
                          >
                            {sendingId === request.id ? 'Envoi...' : 'Envoyer invitation'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.tenant_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.tenant_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.duration_months} mois</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Créé le {new Date(request.created_at).toLocaleDateString('fr-FR')} •
                      Expire le {new Date(request.expires_at).toLocaleDateString('fr-FR')}
                    </div>
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

export default CautionRequests;