import { useState, useEffect } from "react";
import { InventoryForm } from "@/components/InventoryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Eye } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Inventories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadInventories();
    }
  }, [user]);

  const loadInventories = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select(`
          *,
          properties(address, title)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading inventories:', error);
        toast.error('Erreur lors du chargement des états des lieux');
        return;
      }

      setInventories(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement des états des lieux');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('inventories')
        .insert([
          {
            owner_id: user.id,
            property_id: data.propertyId || null,
            inventory_date: data.date,
            inventory_type: data.type,
            rooms: data.rooms,
            general_comments: data.generalComments
          }
        ]);

      if (error) {
        console.error('Error saving inventory:', error);
        toast.error('Erreur lors de la sauvegarde');
        return;
      }

      toast.success('État des lieux enregistré avec succès');
      setIsDialogOpen(false);
      loadInventories();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const generatePDF = async (inventoryId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-inventory-pdf', {
        body: { inventoryId }
      });

      if (error) {
        console.error('PDF generation error:', error);
        toast.error('Erreur lors de la génération du PDF');
        return;
      }

      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etat-des-lieux-${inventoryId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">États des lieux</h1>
              <p className="text-muted-foreground mt-2">
                Gérez vos états des lieux d'entrée et de sortie
              </p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel état des lieux
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un état des lieux</DialogTitle>
                </DialogHeader>
                <InventoryForm onSubmit={handleFormSubmit} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6">
            {inventories.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Aucun état des lieux trouvé</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore créé d'état des lieux. Commencez par en créer un.
                  </p>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Créer mon premier état des lieux
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inventories.map((inventory) => (
                  <Card key={inventory.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {inventory.properties?.title || 'Propriété non spécifiée'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {inventory.properties?.address || 'Adresse non spécifiée'}
                          </p>
                        </div>
                        <Badge variant={inventory.inventory_type === 'entree' ? 'default' : 'secondary'}>
                          {inventory.inventory_type === 'entree' ? 'Entrée' : 'Sortie'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Date:</span> {
                            new Date(inventory.inventory_date).toLocaleDateString('fr-FR')
                          }
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Pièces:</span> {inventory.rooms?.length || 0}
                        </p>
                        {inventory.general_comments && (
                          <p className="text-sm text-muted-foreground truncate">
                            {inventory.general_comments}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generatePDF(inventory.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}