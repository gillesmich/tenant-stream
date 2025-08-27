import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Euro, Calendar, Mail, AlertTriangle, CheckCircle, Download } from "lucide-react";
import Navigation from "@/components/ui/navigation";

const Rents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Données d'exemple
  const rents = [
    {
      id: 1,
      property: "Appartement Centre-Ville",
      tenant: "Marie Dubois",
      amount: 1200,
      month: "2024-12",
      dueDate: "2024-12-05",
      status: "Payé",
      paidDate: "2024-12-03",
      receiptSent: true
    },
    {
      id: 2,
      property: "Maison Familiale",
      tenant: "Famille Martin",
      amount: 2200,
      month: "2024-12",
      dueDate: "2024-12-01",
      status: "Payé",
      paidDate: "2024-12-01",
      receiptSent: true
    },
    {
      id: 3,
      property: "Appartement Centre-Ville",
      tenant: "Marie Dubois",
      amount: 1200,
      month: "2025-01",
      dueDate: "2025-01-05",
      status: "En attente",
      paidDate: null,
      receiptSent: false
    },
    {
      id: 4,
      property: "Studio Quartier Latin",
      tenant: "Pierre Durand",
      amount: 800,
      month: "2024-11",
      dueDate: "2024-11-05",
      status: "Retard",
      paidDate: null,
      receiptSent: false,
      daysLate: 25
    }
  ];

  const filteredRents = rents.filter(rent => {
    const matchesSearch = rent.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rent.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rent.status.toLowerCase().replace(" ", "_") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Payé": return "default";
      case "En attente": return "secondary";
      case "Retard": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Payé": return <CheckCircle className="w-4 h-4" />;
      case "En attente": return <Calendar className="w-4 h-4" />;
      case "Retard": return <AlertTriangle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const totalAmount = filteredRents.reduce((sum, rent) => sum + rent.amount, 0);
  const paidAmount = filteredRents.filter(rent => rent.status === "Payé").reduce((sum, rent) => sum + rent.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestion des Loyers</h1>
            <p className="text-muted-foreground">Suivez les paiements et générez les quittances</p>
          </div>
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau loyer
          </Button>
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
              <SelectItem value="payé">Payé</SelectItem>
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
                      <h3 className="font-semibold text-lg">{rent.property}</h3>
                      <Badge variant={getStatusVariant(rent.status)}>
                        {rent.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-1">{rent.tenant}</p>
                    <p className="text-sm text-muted-foreground">
                      Période: {new Date(rent.month + "-01").toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                    {rent.status === "Retard" && rent.daysLate && (
                      <p className="text-sm text-destructive font-medium">
                        Retard de {rent.daysLate} jours
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{rent.amount}€</p>
                      <p className="text-sm text-muted-foreground">
                        Échéance: {new Date(rent.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                      {rent.paidDate && (
                        <p className="text-sm text-success">
                          Payé le {new Date(rent.paidDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      {rent.status === "Payé" && (
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Quittance
                        </Button>
                      )}
                      {rent.status !== "Payé" && (
                        <Button variant="outline" size="sm">
                          <Mail className="w-4 h-4 mr-1" />
                          Relancer
                        </Button>
                      )}
                      <Button variant="default" size="sm">
                        Marquer payé
                      </Button>
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
            <Button>
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