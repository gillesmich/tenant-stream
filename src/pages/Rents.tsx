import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Euro, Calendar, Mail, AlertTriangle, CheckCircle, Download, Settings } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RentReceiptTemplateManager } from "@/components/RentReceiptTemplateManager";

const Rents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rents, setRents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRents();
    }
  }, [user]);

  const fetchRents = async () => {
    try {
      const { data, error } = await supabase
        .from('rents')
        .select(`
          *,
          lease:leases(
            property:properties(title, address),
            tenant:tenants(first_name, last_name)
          )
        `)
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRents(data || []);
    } catch (error) {
      console.error('Error fetching rents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les loyers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (rentId: string) => {
    try {
      const { error } = await supabase
        .from('rents')
        .update({
          status: 'paye',
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: rents.find(r => r.id === rentId)?.total_amount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', rentId)
        .eq('owner_id', user?.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le loyer a été marqué comme payé",
      });

      fetchRents(); // Refresh the data
    } catch (error) {
      console.error('Error marking rent as paid:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer le loyer comme payé",
        variant: "destructive",
      });
    }
  };

  const downloadReceipt = async (rentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-rent-receipt', {
        body: { 
          rentId,
          templateUrl: selectedTemplate,
          templateName: selectedTemplateName
        }
      });

      if (error) throw error;

      // Create a blob from the response and trigger download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quittance-loyer-${rentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Succès",
        description: "Quittance téléchargée avec succès",
      });
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la quittance",
        variant: "destructive",
      });
    }
  };

  const createNewRent = async () => {
    try {
      // Récupérer les baux actifs
      const { data: activeLeases, error } = await supabase
        .from('leases')
        .select(`
          id,
          rent_amount,
          charges_amount,
          properties (title),
          tenants (first_name, last_name)
        `)
        .eq('owner_id', user?.id)
        .eq('status', 'actif');

      if (error) throw error;

      if (!activeLeases || activeLeases.length === 0) {
        toast({
          title: "Aucun bail actif",
          description: "Vous devez avoir au moins un bail actif pour créer un loyer",
          variant: "destructive",
        });
        return;
      }

      // Pour le moment, créer automatiquement les loyers pour tous les baux actifs pour le mois suivant
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const year = nextMonth.getFullYear();
      const month = nextMonth.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const dueDate = new Date(year, month, 5); // Échéance le 5 du mois

      const rentsToCreate = activeLeases.map(lease => ({
        lease_id: lease.id,
        owner_id: user?.id,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        rent_amount: lease.rent_amount,
        charges_amount: lease.charges_amount || 0,
        total_amount: (lease.rent_amount || 0) + (lease.charges_amount || 0),
        status: 'en_attente'
      }));

      const { error: insertError } = await supabase
        .from('rents')
        .insert(rentsToCreate);

      if (insertError) throw insertError;

      toast({
        title: "Loyers créés",
        description: `${rentsToCreate.length} nouveau(x) loyer(s) créé(s) pour le mois prochain`,
      });

      fetchRents();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de créer les nouveaux loyers",
        variant: "destructive",
      });
    }
  };

  const filteredRents = rents.filter(rent => {
    const propertyTitle = rent.lease?.property?.title || '';
    const tenantName = rent.lease?.tenant ? `${rent.lease.tenant.first_name} ${rent.lease.tenant.last_name}` : '';
    
    const matchesSearch = propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let statusMatch = false;
    if (statusFilter === "all") {
      statusMatch = true;
    } else if (statusFilter === "paye" && rent.status === "paye") {
      statusMatch = true;
    } else if (statusFilter === "en_attente" && rent.status === "en_attente") {
      statusMatch = true;
    } else if (statusFilter === "retard" && rent.status === "retard") {
      statusMatch = true;
    }
    
    return matchesSearch && statusMatch;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paye": return "default";
      case "en_attente": return "secondary";
      case "retard": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paye": return <CheckCircle className="w-4 h-4" />;
      case "en_attente": return <Calendar className="w-4 h-4" />;
      case "retard": return <AlertTriangle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paye": return "Payé";
      case "en_attente": return "En attente";
      case "retard": return "En retard";
      default: return "En attente";
    }
  };

  const totalAmount = filteredRents.reduce((sum, rent) => sum + (rent.total_amount || 0), 0);
  const paidAmount = filteredRents.filter(rent => rent.status === "paye").reduce((sum, rent) => sum + (rent.total_amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

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
            <h1 className="text-3xl font-bold mb-2">Gestion des Loyers</h1>
            <p className="text-muted-foreground">Suivez les paiements et générez les quittances</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Gestion des Templates de Quittance</DialogTitle>
                </DialogHeader>
                <RentReceiptTemplateManager
                  onTemplateSelect={(templateUrl, templateName) => {
                    setSelectedTemplate(templateUrl);
                    setSelectedTemplateName(templateName);
                  }}
                  selectedTemplate={selectedTemplate}
                />
              </DialogContent>
            </Dialog>
            <Button 
              className="bg-gradient-primary"
              onClick={() => createNewRent()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau loyer
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total des loyers</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAmount.toLocaleString()}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loyers perçus</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{paidAmount.toLocaleString()}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{pendingAmount.toLocaleString()}€</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher un loyer..."
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
              <SelectItem value="paye">Payé</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="retard">En retard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredRents.map((rent) => (
            <Card key={rent.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(rent.status)}
                      <h3 className="font-semibold text-lg">{rent.lease?.property?.title || 'Propriété inconnue'}</h3>
                      <Badge variant={getStatusVariant(rent.status)}>
                        {getStatusLabel(rent.status)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-1">
                      {rent.lease?.tenant ? `${rent.lease.tenant.first_name} ${rent.lease.tenant.last_name}` : 'Locataire inconnu'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Période: {new Date(rent.period_start).toLocaleDateString('fr-FR')} - {new Date(rent.period_end).toLocaleDateString('fr-FR')}
                    </p>
                    {rent.status === "retard" && (
                      <p className="text-sm text-destructive font-medium">
                        En retard depuis le {new Date(rent.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{rent.total_amount}€</p>
                      <p className="text-sm text-muted-foreground">
                        Échéance: {new Date(rent.due_date).toLocaleDateString('fr-FR')}
                      </p>
                      {rent.paid_date && (
                        <p className="text-sm text-success">
                          Payé le {new Date(rent.paid_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                       {rent.status === "paye" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadReceipt(rent.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Quittance
                        </Button>
                      )}
                      {rent.status !== "paye" && (
                        <Button variant="outline" size="sm">
                          <Mail className="w-4 h-4 mr-1" />
                          Relancer
                        </Button>
                      )}
                      {rent.status !== "paye" && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => markAsPaid(rent.id)}
                        >
                          Marquer payé
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRents.length === 0 && (
          <div className="text-center py-12">
            <Euro className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun loyer trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Aucun loyer ne correspond à votre recherche" : "Vous n'avez pas encore ajouté de loyer"}
            </p>
            <Button onClick={() => createNewRent()}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un loyer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Rents;