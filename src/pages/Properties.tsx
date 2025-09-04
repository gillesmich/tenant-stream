import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, MapPin, Home, Users, Euro, Edit, Eye } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import PropertyForm from "@/components/PropertyForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Properties = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadProperties();
    }
  }, [user]);

  const loadProperties = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les propriétés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setSelectedProperty(null);
    loadProperties();
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedProperty(null);
  };

  const handleEdit = (property: any) => {
    setSelectedProperty(property);
    setIsDialogOpen(true);
  };

  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold mb-2">Mes Propriétés</h1>
            <p className="text-muted-foreground">Gérez tous vos biens immobiliers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-primary"
                onClick={() => setSelectedProperty(null)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un bien
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <PropertyForm
                property={selectedProperty}
                onSuccess={handleFormSuccess}
                onCancel={handleCancel}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher un bien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{property.title}</CardTitle>
                  <Badge 
                    variant={property.status === "occupé" ? "default" : "secondary"}
                    className={property.status === "occupé" ? "bg-success" : ""}
                  >
                    {property.status === "occupé" ? "Occupé" : "Libre"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.address}, {property.city} {property.postal_code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Home className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="capitalize">{property.property_type}</span>
                  </div>
                  {property.surface && (
                    <div className="flex items-center">
                      <span className="w-4 h-4 mr-2 text-muted-foreground text-xs">m²</span>
                      <span>{property.surface} m²</span>
                    </div>
                  )}
                  {property.rooms && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{property.rooms} pièces</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Euro className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{property.rent_amount}€/mois</span>
                  </div>
                </div>
                
                {property.description && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground line-clamp-2">{property.description}</p>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => toast({
                      title: "Détails de la propriété",
                      description: "Fonctionnalité à venir",
                    })}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Détails
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(property)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProperties.length === 0 && !loading && (
          <div className="text-center py-12">
            <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Aucun bien trouvé" : "Aucune propriété"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Aucun bien ne correspond à votre recherche" 
                : "Vous n'avez pas encore ajouté de bien"
              }
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedProperty(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter votre premier bien
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <PropertyForm
                  property={selectedProperty}
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

export default Properties;