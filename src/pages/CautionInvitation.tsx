import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Euro, Calendar, MapPin } from "lucide-react";
import Navigation from "@/components/ui/navigation";

interface CautionRequest {
  id: string;
  amount: number;
  duration_months: number;
  property_address: string;
  status: string;
  tenant_email: string;
  tenant_phone: string;
}

interface TenantFormData {
  first_name: string;
  last_name: string;
  gender: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
}

const CautionInvitation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [cautionRequest, setCautionRequest] = useState<CautionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"info" | "profile" | "verification" | "payment">("info");
  const [formData, setFormData] = useState<TenantFormData>({
    first_name: "",
    last_name: "",
    gender: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    country: "France",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (id) {
      loadCautionRequest();
    }
  }, [id]);

  const loadCautionRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("caution_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Erreur",
          description: "Demande de caution introuvable",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setCautionRequest(data);
      
      // Pre-fill email and phone from the invitation
      setFormData(prev => ({
        ...prev,
        email: data.tenant_email,
        phone: data.tenant_phone,
      }));

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour accepter une invitation",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setStep("profile");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cautionRequest) return;

    try {
      const { error } = await supabase.from("tenant_profiles").insert({
        user_id: user.id,
        caution_request_id: cautionRequest.id,
        ...formData,
      });

      if (error) throw error;

      // Update caution request status
      await supabase
        .from("caution_requests")
        .update({ status: "accepted" })
        .eq("id", cautionRequest.id);

      toast({
        title: "Profil créé",
        description: "Votre profil a été créé avec succès",
      });

      setStep("verification");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  if (!cautionRequest) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-semibold">Invitation introuvable</p>
              <p className="text-muted-foreground">Cette invitation n'existe pas ou a expiré.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {step === "info" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Invitation à une caution locative
              </CardTitle>
              <CardDescription>
                Vous avez été invité à constituer une caution locative
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Euro className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Montant</p>
                    <p className="text-sm text-muted-foreground">
                      {(cautionRequest.amount / 100).toLocaleString('fr-FR')} €
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Durée</p>
                    <p className="text-sm text-muted-foreground">
                      {cautionRequest.duration_months} mois
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Propriété</p>
                  <p className="text-sm text-muted-foreground">
                    {cautionRequest.property_address}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Processus de caution</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Accepter l'invitation et remplir votre profil</li>
                  <li>2. Vérification par email et SMS (2FA)</li>
                  <li>3. Réservation du montant via paiement sécurisé</li>
                  <li>4. Caution active pendant la durée du bail</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleAcceptInvitation} className="flex-1">
                  Accepter l'invitation
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                  Refuser
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Compléter votre profil</CardTitle>
              <CardDescription>
                Remplissez vos informations personnelles pour la caution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="gender">Genre</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                      <SelectItem value="Other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="address_line1">Adresse ligne 1</Label>
                  <Input
                    id="address_line1"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address_line2">Adresse ligne 2 (optionnel)</Label>
                  <Input
                    id="address_line2"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Continuer vers la vérification
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "verification" && (
          <Card>
            <CardHeader>
              <CardTitle>Vérification en cours</CardTitle>
              <CardDescription>
                La vérification 2FA sera implémentée prochainement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <p className="text-lg font-semibold">Profil créé avec succès!</p>
                <p className="text-muted-foreground">
                  Votre demande de caution a été acceptée et votre profil créé.
                  La vérification 2FA et le système de paiement seront disponibles bientôt.
                </p>
                <Button onClick={() => navigate("/")} className="mt-4">
                  Retourner au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CautionInvitation;