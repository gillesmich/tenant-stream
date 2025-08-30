import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/ui/navigation";
import { FileText, Home, Calendar, Euro, Download, PenTool, Clock, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const TenantDashboard = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [lease, setLease] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [cautionRequests, setCautionRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTenantData = async () => {
    if (!user) return;

    try {
      // Find lease for this tenant
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          properties (*)
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .maybeSingle();

      if (leaseError) throw leaseError;

      setLease(leaseData);
      setProperty(leaseData?.properties);

      // Load documents related to this tenant's lease
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .or(`lease_id.eq.${leaseData?.id},property_id.eq.${leaseData?.property_id}`)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      setDocuments(docsData || []);

      // Load caution requests for this tenant's email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (profileData?.email) {
        const { data: cautionData, error: cautionError } = await supabase
          .from('caution_requests')
          .select('*')
          .eq('tenant_email', profileData.email)
          .order('created_at', { ascending: false });

        if (!cautionError) {
          setCautionRequests(cautionData || []);
        }
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          signed: true,
          signed_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      // Reload documents
      loadTenantData();
    } catch (error) {
      console.error('Error signing document:', error);
    }
  };

  useEffect(() => {
    loadTenantData();
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
            Espace locataire
          </h1>
          <p className="text-muted-foreground">
            Accédez à vos documents et informations de location
          </p>
        </div>

        {/* Current Lease Info */}
        {lease && property && (
          <div className="mb-8">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="w-5 h-5 mr-2 text-primary" />
                  Mon logement actuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                    <p className="font-semibold">{property.address}</p>
                    <p className="text-sm text-muted-foreground">{property.postal_code} {property.city}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type de bien</p>
                    <p className="font-semibold">{property.property_type}</p>
                    <p className="text-sm text-muted-foreground">{property.surface}m² - {property.rooms} pièces</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Loyer mensuel</p>
                    <p className="font-semibold">{lease.rent_amount}€</p>
                    {lease.charges_amount > 0 && (
                      <p className="text-sm text-muted-foreground">+ {lease.charges_amount}€ de charges</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Durée du bail</p>
                    <p className="font-semibold">
                      Du {new Date(lease.start_date).toLocaleDateString('fr-FR')}
                    </p>
                    {lease.end_date && (
                      <p className="text-sm text-muted-foreground">
                        au {new Date(lease.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Caution Requests Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Mes demandes de caution</h2>
          </div>

          {cautionRequests.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="text-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune demande de caution</h3>
                <p className="text-muted-foreground">
                  Vos demandes de caution apparaîtront ici lorsque vous en recevrez.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cautionRequests.map((request) => (
                <Card key={request.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Caution locative
                      </span>
                      {request.status === 'pending' ? (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      ) : request.status === 'accepted' ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acceptée
                        </Badge>
                      ) : request.status === 'invited' ? (
                        <Badge variant="outline">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Invité
                        </Badge>
                      ) : null}
                    </CardTitle>
                    <CardDescription>
                      {request.property_address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-muted-foreground">Montant</p>
                          <p className="font-semibold">{(request.amount / 100).toLocaleString('fr-FR')} €</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Durée</p>
                          <p className="font-semibold">{request.duration_months} mois</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Créée le {new Date(request.created_at).toLocaleDateString('fr-FR')}</p>
                        <p>Expire le {new Date(request.expires_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      
                      {request.status === 'pending' && (
                        <Button 
                          size="sm" 
                          className="w-full"
                          asChild
                        >
                          <Link to={`/caution-invitation/${request.id}`}>
                            Voir l'invitation
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Mes documents</h2>
          </div>

          {documents.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun document disponible</h3>
                <p className="text-muted-foreground">
                  Vos documents apparaîtront ici une fois qu'ils seront ajoutés par votre propriétaire.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {doc.title}
                      </span>
                      {doc.signed ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <PenTool className="w-3 h-3 mr-1" />
                          Signé
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          À signer
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Type: {doc.document_type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p>Créé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                        {doc.signed && doc.signed_at && (
                          <p>Signé le {new Date(doc.signed_at).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {doc.file_url && (
                          <Button variant="outline" size="sm" asChild className="flex-1">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        )}
                        
                        {!doc.signed && doc.document_type !== 'contrat_location' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleSignDocument(doc.id)}
                            className="flex-1"
                          >
                            <PenTool className="w-4 h-4 mr-2" />
                            Signer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                Mes cautions
              </CardTitle>
              <CardDescription>
                Voir toutes mes demandes de caution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/tenant/cautions">
                  Voir mes cautions
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Paiements
              </CardTitle>
              <CardDescription>
                Consultez l'historique de vos loyers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/tenant/payments">
                  Voir mes paiements
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Support
              </CardTitle>
              <CardDescription>
                Contactez votre propriétaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Envoyer un message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;