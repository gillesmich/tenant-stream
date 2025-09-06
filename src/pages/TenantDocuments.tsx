import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/ui/navigation";
import { FileText, Download, PenTool, Clock, Eye, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const TenantDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const documentTypes = [
    { value: "contrat_location", label: "Contrat de location" },
    { value: "etat_lieux_entree", label: "État des lieux d'entrée" },
    { value: "etat_lieux_sortie", label: "État des lieux de sortie" },
    { value: "quittance_loyer", label: "Quittance de loyer" },
    { value: "justificatif_paiement", label: "Justificatif de paiement" },
    { value: "courrier", label: "Courrier" },
    { value: "autre", label: "Autre" }
  ];

  const loadDocuments = async () => {
    if (!user) return;

    try {
      // Récupérer les documents liés aux baux du locataire
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          properties (title, address),
          leases (
            id,
            start_date, 
            end_date,
            tenant_validation_status,
            tenant_validation_code,
            validation_expires_at,
            properties (title, address)
          )
        `)
        .not('lease_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLeases = async () => {
    if (!user) return;

    try {
      // Récupérer les baux liés au locataire par email
      const userProfile = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (userProfile.data?.email) {
        const { data, error } = await supabase
          .from('leases')
          .select(`
            *,
            properties (title, address),
            tenants (first_name, last_name, email)
          `)
          .or(`tenant_phone.eq.${userProfile.data.email},tenants.email.eq.${userProfile.data.email}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLeases(data || []);
      }
    } catch (error) {
      console.error('Error loading leases:', error);
    }
  };

  const handleValidateLease = (leaseId: string) => {
    navigate(`/lease-validation/${leaseId}`);
  };

  useEffect(() => {
    loadDocuments();
    loadLeases();
  }, [user]);

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Mes Documents
          </h1>
          <p className="text-muted-foreground">
            Consultez vos contrats et documents liés à vos locations
          </p>
        </div>

        {/* Section des baux à valider */}
        {leases.filter(lease => 
          lease.tenant_validation_status === 'pending' && 
          lease.tenant_validation_code &&
          new Date(lease.validation_expires_at) > new Date()
        ).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contrats en attente de validation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leases
                .filter(lease => 
                  lease.tenant_validation_status === 'pending' && 
                  lease.tenant_validation_code &&
                  new Date(lease.validation_expires_at) > new Date()
                )
                .map((lease) => (
                  <Card key={lease.id} className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                        Validation requise
                      </CardTitle>
                      <CardDescription>
                        {lease.properties?.title} - {lease.properties?.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Vous avez reçu un code de validation par email pour finaliser ce contrat.
                      </p>
                      <Button 
                        onClick={() => handleValidateLease(lease.id)}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Valider le contrat
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Section des documents */}
        {documents.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
              <p className="text-muted-foreground">
                Vos documents liés aux contrats de location apparaîtront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Mes documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {doc.title}
                      </span>
                      <div className="flex gap-1">
                        {doc.auto_generated && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                        {doc.signed ? (
                          <Badge variant="default" className="bg-success text-success-foreground">
                            <PenTool className="w-3 h-3 mr-1" />
                            Signé
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Non signé
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {doc.leases?.properties && (
                        <div className="text-sm">
                          <strong>Propriété:</strong> {doc.leases.properties.title}
                        </div>
                      )}
                      
                      {doc.leases && (
                        <div className="text-sm">
                          <strong>Bail:</strong> Du {new Date(doc.leases.start_date).toLocaleDateString('fr-FR')}
                          {doc.leases.end_date && ` au ${new Date(doc.leases.end_date).toLocaleDateString('fr-FR')}`}
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground">
                        Créé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      
                      {doc.signed && doc.signed_at && (
                        <div className="text-sm text-success">
                          Signé le {new Date(doc.signed_at).toLocaleDateString('fr-FR')}
                        </div>
                      )}

                      {/* Validation du bail associé */}
                      {doc.leases && doc.leases.tenant_validation_status === 'pending' && 
                       doc.leases.tenant_validation_code && 
                       new Date(doc.leases.validation_expires_at) > new Date() && (
                        <div className="bg-orange-100 dark:bg-orange-950/30 p-2 rounded mt-2">
                          <div className="text-xs text-orange-800 dark:text-orange-200 mb-1">
                            Contrat en attente de validation
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleValidateLease(doc.leases.id)}
                            className="text-xs h-7"
                          >
                            Valider maintenant
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        {doc.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        )}
                        
                        {doc.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDocuments;