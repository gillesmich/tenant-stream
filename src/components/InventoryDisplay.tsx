import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Room {
  name: string;
  description?: string;
  condition: "neuf" | "bon" | "moyen" | "mauvais";
  photos?: string[];
}

interface Inventory {
  id: string;
  inventory_date: string;
  inventory_type: "entree" | "sortie";
  rooms: Room[];
  general_comments?: string;
  tenant_phone?: string;
  tenant_name?: string;
  properties?: {
    title: string;
    address: string;
  };
}

interface InventoryDisplayProps {
  inventory: Inventory;
}

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
    neuf: "bg-green-100 text-green-800",
    bon: "bg-blue-100 text-blue-800",
    moyen: "bg-yellow-100 text-yellow-800", 
    mauvais: "bg-red-100 text-red-800"
  };
  return colors[condition as keyof typeof colors] || "bg-gray-100 text-gray-800";
};

export function InventoryDisplay({ inventory }: InventoryDisplayProps) {
  const generatePDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-inventory-pdf', {
        body: { inventoryId: inventory.id }
      });

      if (error) {
        console.error('Error generating PDF:', error);
        toast.error("Erreur lors de la génération du PDF");
        return;
      }

      // Create blob from response
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `etat-des-lieux-${inventory.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF généré avec succès!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 print:p-4" id="inventory-display">
      {/* Header */}
      <div className="text-center border-b pb-6">
        <h1 className="text-3xl font-bold print:text-2xl">État des lieux</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <Label className="font-semibold">Propriété:</Label>
            <p>{inventory.properties?.title || "Lieu du bien"}</p>
          </div>
          <div>
            <Label className="font-semibold">Adresse:</Label>
            <p>{inventory.properties?.address || "Lieu du bien"}</p>
          </div>
          <div>
            <Label className="font-semibold">Date:</Label>
            <p>{new Date(inventory.inventory_date).toLocaleDateString('fr-FR')}</p>
          </div>
          {inventory.tenant_name && (
            <div>
              <Label className="font-semibold">Locataire:</Label>
              <p>{inventory.tenant_name}</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <Badge variant={inventory.inventory_type === 'entree' ? 'default' : 'secondary'} className="text-sm">
            {inventory.inventory_type === 'entree' ? 'État des lieux d\'entrée' : 'État des lieux de sortie'}
          </Badge>
          <Button onClick={generatePDF} className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Générer PDF
          </Button>
        </div>
      </div>

      {/* Rooms */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Détail des pièces</h2>
        
        {inventory.rooms.map((room, index) => (
          <Card key={index} className="print:shadow-none print:border">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{room.name}</CardTitle>
                <Badge className={`${getConditionColor(room.condition)} border-0`}>
                  {getConditionLabel(room.condition)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {room.description && (
                <div>
                  <Label className="font-semibold">Description:</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{room.description}</p>
                </div>
              )}
              
              {room.photos && room.photos.length > 0 && (
                <div>
                  <Label className="font-semibold">Photos:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {room.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="relative">
                        <img
                          src={photo}
                          alt={`Photo ${photoIndex + 1} - ${room.name}`}
                          className="w-full h-32 object-cover rounded border print:h-24"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!room.photos || room.photos.length === 0) && (
                <div className="flex items-center text-muted-foreground text-sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Aucune photo
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* General Comments */}
      {inventory.general_comments && (
        <Card className="print:shadow-none print:border">
          <CardHeader>
            <CardTitle>Commentaires généraux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{inventory.general_comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="border-t pt-6 text-center text-sm text-muted-foreground print:text-xs">
        <p>État des lieux généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
      </div>
    </div>
  );
}