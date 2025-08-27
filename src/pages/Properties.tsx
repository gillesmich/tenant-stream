import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Home, Users, Euro } from "lucide-react";
import Navigation from "@/components/ui/navigation";

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Données d'exemple
  const properties = [
    {
      id: 1,
      name: "Appartement Centre-Ville",
      address: "15 rue de la Paix, 75001 Paris",
      type: "Appartement",
      surface: 65,
      rooms: 3,
      rent: 1200,
      tenant: "Marie Dubois",
      status: "Occupé"
    },
    {
      id: 2,
      name: "Studio Quartier Latin",
      address: "8 boulevard Saint-Michel, 75005 Paris",
      type: "Studio",
      surface: 25,
      rooms: 1,
      rent: 800,
      tenant: null,
      status: "Libre"
    },
    {
      id: 3,
      name: "Maison Familiale",
      address: "42 avenue des Tilleuls, 94100 Vincennes",
      type: "Maison",
      surface: 120,
      rooms: 5,
      rent: 2200,
      tenant: "Famille Martin",
      status: "Occupé"
    }
  ];

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mes Propriétés</h1>
            <p className="text-muted-foreground">Gérez tous vos biens immobiliers</p>
          </div>
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un bien
          </Button>
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
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  <Badge 
                    variant={property.status === "Occupé" ? "default" : "secondary"}
                    className={property.status === "Occupé" ? "bg-success" : ""}
                  >
                    {property.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Home className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{property.type}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 mr-2 text-muted-foreground text-xs">m²</span>
                    <span>{property.surface} m²</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{property.rooms} pièces</span>
                  </div>
                  <div className="flex items-center">
                    <Euro className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{property.rent}€/mois</span>
                  </div>
                </div>
                
                {property.tenant && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Locataire actuel</p>
                    <p className="font-medium">{property.tenant}</p>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Voir détails
                  </Button>
                  <Button variant="default" size="sm" className="flex-1">
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun bien trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Aucun bien ne correspond à votre recherche" : "Vous n'avez pas encore ajouté de bien"}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter votre premier bien
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;