import { useState } from "react";
import { InventoryForm } from "@/components/InventoryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import Navigation from "@/components/ui/navigation";

export default function Inventories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFormSubmit = (data: any) => {
    console.log("Inventory data:", data);
    // TODO: Save to database
    setIsDialogOpen(false);
  };

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
          </div>
        </div>
      </div>
    </div>
  );
}