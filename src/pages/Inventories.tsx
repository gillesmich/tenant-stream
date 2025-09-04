import { useState, useEffect } from "react";
import { InventoryForm } from "@/components/InventoryForm";
import { InventoryDisplay } from "@/components/InventoryDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Eye, Edit2 } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Inventories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<any>(null);
  const [viewingInventory, setViewingInventory] = useState<any>(null);
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
      if (editingInventory) {
        // Update existing inventory
        const { error } = await supabase
          .from('inventories')
          .update({
            property_id: data.propertyId || null,
            inventory_date: data.date,
            inventory_type: data.type,
            rooms: data.rooms,
            general_comments: data.generalComments
          })
          .eq('id', editingInventory.id);

        if (error) {
          console.error('Error updating inventory:', error);
          toast.error('Erreur lors de la mise à jour');
          return;
        }

        toast.success('État des lieux mis à jour avec succès');
      } else {
        // Create new inventory
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
      }
      
      setIsDialogOpen(false);
      setEditingInventory(null);
      loadInventories();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (inventory: any) => {
    setEditingInventory(inventory);
    setIsDialogOpen(true);
  };

  const handleView = (inventory: any) => {
    setViewingInventory(inventory);
    setIsViewDialogOpen(true);
  };

  const handleNewInventory = () => {
    setEditingInventory(null);
    setIsDialogOpen(true);
  };

  const generatePDF = async (inventoryId: string) => {
    try {
      // Find the inventory to display
      const inventory = inventories.find(inv => inv.id === inventoryId);
      if (!inventory) {
        toast.error('État des lieux introuvable');
        return;
      }

      // Open new window and render the display component
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup bloquée: autorisez les pop-ups pour prévisualiser le PDF');
        return;
      }

      // Generate HTML that matches the display component
      const html = generateInventoryHTML(inventory);
      printWindow.document.write(html);
      printWindow.document.close();

      // Add print styles and trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const generateInventoryHTML = (inventory: any) => {
    const getConditionLabel = (condition: string) => {
      const labels = {
        neuf: "Neuf",
        bon: "Bon état", 
        moyen: "État moyen",
        mauvais: "Mauvais état"
      };
      return labels[condition as keyof typeof labels] || condition;
    };

    const getConditionColor = (condition: string) => {
      const colors = {
        neuf: "#dcfce7; color: #166534",
        bon: "#dbeafe; color: #1e40af",
        moyen: "#fef3c7; color: #92400e", 
        mauvais: "#fee2e2; color: #991b1b"
      };
      return colors[condition as keyof typeof colors] || "#f3f4f6; color: #374151";
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>État des lieux - ${inventory.properties?.title || 'Propriété'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 28px; margin-bottom: 20px; }
            .header-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .header-info div { text-align: left; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; }
            .badge-entree { background: #dbeafe; color: #1e40af; }
            .badge-sortie { background: #f3f4f6; color: #374151; }
            .room { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 25px; padding: 20px; }
            .room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .room-title { font-size: 18px; font-weight: 600; }
            .condition-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; background: }
            .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
            .photo { width: 100%; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }
            .comments { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-top: 30px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .photo { height: 80px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>État des lieux</h1>
            <div class="header-info">
              <div><strong>Propriété:</strong><br>${inventory.properties?.title || "Non spécifiée"}</div>
              <div><strong>Adresse:</strong><br>${inventory.properties?.address || "Non spécifiée"}</div>
              <div><strong>Date:</strong><br>${new Date(inventory.inventory_date).toLocaleDateString('fr-FR')}</div>
            </div>
            <div>
              <span class="badge badge-${inventory.inventory_type}">
                ${inventory.inventory_type === 'entree' ? 'État des lieux d\'entrée' : 'État des lieux de sortie'}
              </span>
            </div>
          </div>

          <h2>Détail des pièces</h2>
          ${inventory.rooms.map((room: any) => `
            <div class="room">
              <div class="room-header">
                <div class="room-title">${room.name}</div>
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${getConditionColor(room.condition)}">
                  ${getConditionLabel(room.condition)}
                </span>
              </div>
              ${room.description ? `<div style="margin-bottom: 15px;"><strong>Description:</strong><br><span style="color: #6b7280;">${room.description}</span></div>` : ''}
              ${room.photos && room.photos.length > 0 ? `
                <div>
                  <strong>Photos:</strong>
                  <div class="photo-grid">
                    ${room.photos.map((photo: string) => `<img src="${photo}" alt="Photo ${room.name}" class="photo">`).join('')}
                  </div>
                </div>
              ` : '<div style="color: #6b7280; font-size: 14px;">📷 Aucune photo</div>'}
            </div>
          `).join('')}

          ${inventory.general_comments ? `
            <div class="comments">
              <h3>Commentaires généraux</h3>
              <p style="color: #6b7280;">${inventory.general_comments}</p>
            </div>
          ` : ''}

          <div class="footer">
            État des lieux généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </body>
      </html>
    `;
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
                <Button onClick={handleNewInventory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel état des lieux
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingInventory ? 'Modifier l\'état des lieux' : 'Créer un état des lieux'}
                  </DialogTitle>
                </DialogHeader>
                <InventoryForm 
                  onSubmit={handleFormSubmit}
                  onCancel={() => { setIsDialogOpen(false); setEditingInventory(null); }} 
                  initialData={editingInventory ? {
                    date: editingInventory.inventory_date,
                    type: editingInventory.inventory_type,
                    rooms: editingInventory.rooms,
                    generalComments: editingInventory.general_comments,
                    propertyId: editingInventory.property_id
                  } : undefined}
                />
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
                  <Button variant="outline" onClick={handleNewInventory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer mon premier état des lieux
                  </Button>
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
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(inventory)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(inventory)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
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

          {/* View Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>État des lieux</DialogTitle>
              </DialogHeader>
              {viewingInventory && <InventoryDisplay inventory={viewingInventory} />}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}