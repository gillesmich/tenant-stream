import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, Calendar, Euro, Download, Send, Settings } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { LeaseForm } from "@/components/LeaseForm";
import { PDFTemplateManager } from "@/components/PDFTemplateManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Leases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(() => {
    try {
      return localStorage.getItem('leaseTemplateUrl');
    } catch {
      return null;
    }
  });
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('leaseTemplateName');
    } catch {
      return null;
    }
  });
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  useEffect(() => {
    if (user) {
      loadLeases();
    }
  }, [user]);

  const loadLeases = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          properties (title, address),
          tenants (first_name, last_name)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeases(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les baux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setSelectedLease(null);
    loadLeases();
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedLease(null);
  };

  const handleEdit = (lease: any) => {
    setSelectedLease(lease);
    setIsDialogOpen(true);
  };

  const generatePDF = async (leaseId: string) => {
    try {
      console.log('Génération PDF avec template:', selectedTemplate, 'nom:', selectedTemplateName);
      
      // Open a preview tab immediately to avoid popup blockers and show progress
      const preview = window.open('', '_blank');
      if (!preview) {
        toast({
          title: "Popup bloquée",
          description: "Autorisez les pop-ups pour prévisualiser le PDF",
          variant: "destructive",
        });
        return;
      }
      preview.document.write(`
        <!doctype html>
        <title>Génération du PDF…</title>
        <body style="font-family:sans-serif;padding:16px">
          <p>Génération du PDF du bail…</p>
          ${selectedTemplate && selectedTemplateName ? 
            `<p>Utilisation du template: <strong>${selectedTemplateName}</strong></p>` : 
            '<p>Utilisation du format standard</p>'
          }
          <p>Veuillez patienter.</p>
        </body>
      `);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      // Générer une URL signée si on a un chemin de template (bucket privé)
      let effectiveTemplateUrl: string | null = null;
      if (selectedTemplate) {
        if (selectedTemplate.startsWith('http')) {
          effectiveTemplateUrl = selectedTemplate;
        } else {
          const { data: signed } = await supabase.storage
            .from('documents')
            .createSignedUrl(selectedTemplate, 180);
          effectiveTemplateUrl = signed?.signedUrl || null;
        }
      }

      const requestBody = { 
        leaseId,
        templateUrl: effectiveTemplateUrl 
      };
      console.log('Request body:', requestBody);

      const res = await fetch(
        'https://vbpyykdkaoktzuewbzzl.supabase.co/functions/v1/generate-lease-pdf',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/pdf',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Erreur API:', errorText);
        throw new Error('Failed to generate PDF');
      }

      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Display in the opened tab
      preview.location.replace(url);
      preview.addEventListener('beforeunload', () => window.URL.revokeObjectURL(url));
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le PDF",
        variant: "destructive",
      });
    }
  };

  const sendLease = async (leaseId: string) => {
    try {
      // Préparer une URL signée si un template privé est sélectionné
      let effectiveTemplateUrl: string | null = null;
      if (selectedTemplate) {
        if (selectedTemplate.startsWith('http')) {
          effectiveTemplateUrl = selectedTemplate;
        } else {
          const { data: signed } = await supabase.storage
            .from('documents')
            .createSignedUrl(selectedTemplate, 180);
          effectiveTemplateUrl = signed?.signedUrl || null;
        }
      }

      const { data, error } = await supabase.functions.invoke('send-lease-email', {
        body: { leaseId, templateUrl: effectiveTemplateUrl }
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Le bail PDF a été envoyé au locataire.",
      });

      // Recharger les baux pour mettre à jour le statut éventuel
      loadLeases();
    } catch (error: any) {
      console.error('Erreur envoi bail:', error);
      toast({
        title: "Erreur",
        description: error?.message ?? "Impossible d'envoyer le bail",
        variant: "destructive",
      });
    }
  };

  const sendValidationCode = async (leaseId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-lease-validation-code', {
        body: { leaseId }
      });

      if (error) throw error;

      toast({
        title: "Code envoyé",
        description: "Le code de validation a été envoyé au locataire par email.",
      });

      // Recharger les baux pour mettre à jour le statut
      loadLeases();
    } catch (error: any) {
      console.error('Erreur envoi code validation:', error);
      toast({
        title: "Erreur",
        description: error?.message ?? "Impossible d'envoyer le code de validation",
        variant: "destructive",
      });
    }
  };

  const filteredLeases = leases.filter(lease => {
    const propertyName = lease.properties?.title || '';
    const tenantName = `${lease.tenants?.first_name || ''} ${lease.tenants?.last_name || ''}`.trim();
    const matchesSearch = propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lease.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "actif": return "default";
      case "expire": return "destructive";
      case "brouillon": return "secondary";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12">
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
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestion des Baux</h1>
            <p className="text-muted-foreground">Créez et gérez tous vos contrats de location</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowTemplateManager(!showTemplateManager)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Templates PDF {selectedTemplateName && `(${selectedTemplateName})`}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-primary"
                  onClick={() => setSelectedLease(null)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau bail
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedLease ? 'Modifier le bail' : 'Nouveau bail'}
                  </DialogTitle>
                </DialogHeader>
                <LeaseForm
                  lease={selectedLease}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancel}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {showTemplateManager && (
          <div className="mb-6">
            <PDFTemplateManager
              selectedTemplate={selectedTemplate}
              onTemplateSelect={(url, name) => {
                setSelectedTemplate(url);
                setSelectedTemplateName(name);
                try {
                  if (url) {
                    localStorage.setItem('leaseTemplateUrl', url);
                    localStorage.setItem('leaseTemplateName', name || '');
                  } else {
                    localStorage.removeItem('leaseTemplateUrl');
                    localStorage.removeItem('leaseTemplateName');
                  }
                } catch {}
                
                // Afficher un message de confirmation
                if (url && name) {
                  toast({
                    title: "Template sélectionné",
                    description: `Le template "${name}" sera utilisé pour générer les PDFs de bail`,
                  });
                } else {
                  toast({
                    title: "Template désélectionné", 
                    description: "Les PDFs seront générés avec le format standard",
                  });
                }
              }}
            />
          </div>
        )}

        {/* Affichage du template actuel */}
        {selectedTemplate && selectedTemplateName && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm">
                <strong>Template actuel :</strong> {selectedTemplateName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTemplate(null);
                  setSelectedTemplateName(null);
                  localStorage.removeItem('leaseTemplateUrl');
                  localStorage.removeItem('leaseTemplateName');
                  toast({
                    title: "Template supprimé",
                    description: "Les PDFs seront générés avec le format standard",
                  });
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher un bail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="expiré">Expiré</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLeases.map((lease) => (
            <Card key={lease.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{lease.properties?.title || 'Propriété non trouvée'}</CardTitle>
                    <CardDescription>
                      {lease.tenants 
                        ? `${lease.tenants.first_name} ${lease.tenants.last_name}`
                        : 'Locataire non assigné'
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(lease.status)}>
                      {lease.status}
                    </Badge>
                    <Badge variant="outline" className={lease.lease_type === "meuble" ? "border-accent text-accent" : ""}>
                      {lease.lease_type === "vide" ? "Vide" : 
                       lease.lease_type === "meuble" ? "Meublé" :
                       lease.lease_type === "commercial" ? "Commercial" :
                       lease.lease_type === "professionnel" ? "Professionnel" :
                       lease.lease_type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Début: {new Date(lease.start_date).toLocaleDateString('fr-FR')}</p>
                      <p className="text-muted-foreground">
                        Fin: {lease.end_date ? new Date(lease.end_date).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Euro className="w-4 h-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{lease.rent_amount}€/mois</p>
                      <p className="text-muted-foreground">
                        Dépôt: {lease.deposit_amount ? `${lease.deposit_amount}€` : 'Non défini'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {lease.signed_by_tenant && lease.signed_by_owner ? "✅ Signé" : "⏳ En attente de signature"}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => generatePDF(lease.id)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  {!(lease.signed_by_tenant && lease.signed_by_owner) && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => sendLease(lease.id)}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Envoyer PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => sendValidationCode(lease.id)}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Code validation
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(lease)}
                  >
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLeases.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun bail trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Aucun bail ne correspond à votre recherche" : "Vous n'avez pas encore créé de bail"}
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedLease(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer votre premier bail
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <LeaseForm
                  lease={selectedLease}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancel}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leases;