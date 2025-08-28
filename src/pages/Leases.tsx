import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Calendar, Euro, Download, Send } from "lucide-react";
import Navigation from "@/components/ui/navigation";

const Leases = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Données d'exemple
  const leases = [
    {
      id: 1,
      property: "Appartement Centre-Ville",
      tenant: "Marie Dubois",
      type: "Meublé",
      startDate: "2024-01-15",
      endDate: "2025-01-14",
      rent: 1200,
      deposit: 2400,
      status: "Actif",
      signed: true
    },
    {
      id: 2,
      property: "Maison Familiale",
      tenant: "Famille Martin",
      type: "Vide",
      startDate: "2024-03-01",
      endDate: "2027-02-28",
      rent: 2200,
      deposit: 4400,
      status: "Actif",
      signed: true
    },
    {
      id: 3,
      property: "Studio Quartier Latin",
      tenant: "En attente",
      type: "Meublé",
      startDate: "2024-12-01",
      endDate: "2025-11-30",
      rent: 800,
      deposit: 1600,
      status: "Brouillon",
      signed: false
    }
  ];

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = lease.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lease.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lease.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Actif": return "default";
      case "Expiré": return "destructive";
      case "Brouillon": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestion des Baux</h1>
            <p className="text-muted-foreground">Créez et gérez tous vos contrats de location</p>
          </div>
          <Button 
            className="bg-gradient-primary"
            onClick={() => {
              // TODO: Implement new lease creation modal
              console.log("Nouveau bail clicked");
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau bail
          </Button>
        </div>

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
                    <CardTitle className="text-lg">{lease.property}</CardTitle>
                    <CardDescription>{lease.tenant}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(lease.status)}>
                      {lease.status}
                    </Badge>
                    <Badge variant="outline" className={lease.type === "Meublé" ? "border-accent text-accent" : ""}>
                      {lease.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Début: {new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                      <p className="text-muted-foreground">Fin: {new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Euro className="w-4 h-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{lease.rent}€/mois</p>
                      <p className="text-muted-foreground">Dépôt: {lease.deposit}€</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {lease.signed ? "✅ Signé" : "⏳ En attente de signature"}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => console.log("Download PDF for lease", lease.id)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  {!lease.signed && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => console.log("Send lease", lease.id)}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Envoyer
                    </Button>
                  )}
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => console.log("Edit lease", lease.id)}
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
            <Button
              onClick={() => {
                // TODO: Implement new lease creation modal
                console.log("Create first lease clicked");
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer votre premier bail
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leases;