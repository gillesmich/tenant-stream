import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Home, User, Calendar, Euro, AlertCircle } from "lucide-react";

const LeaseValidation = () => {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [validationCode, setValidationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [lease, setLease] = useState<any>(null);
  const [loadingLease, setLoadingLease] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);

  useEffect(() => {
    if (leaseId) {
      loadLease();
    }
  }, [leaseId]);

  const loadLease = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          properties (title, address),
          tenants (first_name, last_name, email)
        `)
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError("Bail introuvable");
        return;
      }

      setLease(data);
      
      // Calculer les tentatives restantes
      const attempts = data.validation_attempts || 0;
      setAttemptsRemaining(Math.max(0, 5 - attempts));

      // Vérifier si déjà validé
      if (data.tenant_validation_status === 'validated') {
        setError("Ce bail a déjà été validé");
      }
      
      // Vérifier si expiré
      if (data.validation_expires_at && new Date(data.validation_expires_at) < new Date()) {
        setError("Le code de validation a expiré");
      }

    } catch (error: any) {
      console.error('Erreur chargement bail:', error);
      setError("Erreur lors du chargement du bail");
    } finally {
      setLoadingLease(false);
    }
  };

  const handleValidate = async () => {
    if (!validationCode || validationCode.length !== 6) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un code à 6 chiffres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-lease-code', {
        body: { leaseId, validationCode }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Validation réussie !",
          description: "Votre contrat de location a été validé avec succès",
        });
        
        // Rediriger vers une page de confirmation ou d'accueil
        navigate('/');
      }
    } catch (error: any) {
      console.error('Erreur validation:', error);
      
      if (error.message?.includes('Code incorrect')) {
        const newAttempts = attemptsRemaining - 1;
        setAttemptsRemaining(newAttempts);
        toast({
          title: "Code incorrect",
          description: `Il vous reste ${newAttempts} tentative(s)`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de la validation",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingLease) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">{error}</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Bail introuvable</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Validation du contrat de location</h1>
          <p className="text-muted-foreground">
            Saisissez le code de validation reçu par email pour finaliser votre contrat
          </p>
        </div>

        {/* Informations du bail */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Détails du contrat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{lease.properties?.title}</p>
                  <p className="text-sm text-muted-foreground">{lease.properties?.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {lease.tenants?.first_name} {lease.tenants?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{lease.tenants?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    Du {new Date(lease.start_date).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lease.end_date 
                      ? `Au ${new Date(lease.end_date).toLocaleDateString('fr-FR')}`
                      : 'Durée indéterminée'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{lease.rent_amount}€/mois</p>
                  <p className="text-sm text-muted-foreground">
                    Dépôt: {lease.deposit_amount || 0}€
                  </p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Type de bail:</span>
              <Badge variant="outline">
                {lease.lease_type === "vide" ? "Vide" : 
                 lease.lease_type === "meuble" ? "Meublé" :
                 lease.lease_type === "commercial" ? "Commercial" :
                 lease.lease_type === "professionnel" ? "Professionnel" :
                 lease.lease_type}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Code de validation
            </CardTitle>
            <CardDescription>
              Saisissez le code à 6 chiffres reçu par email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lease.validation_expires_at && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Code valide jusqu'au {' '}
                  {new Date(lease.validation_expires_at).toLocaleDateString('fr-FR')} à {' '}
                  {new Date(lease.validation_expires_at).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="validation-code" className="text-sm font-medium">
                Code de validation
              </label>
              <Input
                id="validation-code"
                type="text"
                placeholder="123456"
                value={validationCode}
                onChange={(e) => setValidationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground text-center">
                Tentatives restantes: {attemptsRemaining}/5
              </p>
            </div>

            <Button 
              onClick={handleValidate}
              disabled={loading || validationCode.length !== 6 || attemptsRemaining === 0}
              className="w-full"
              size="lg"
            >
              {loading ? "Validation en cours..." : "Valider le contrat"}
            </Button>

            <div className="text-center">
              <Button 
                variant="link" 
                size="sm"
                onClick={() => navigate('/')}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaseValidation;