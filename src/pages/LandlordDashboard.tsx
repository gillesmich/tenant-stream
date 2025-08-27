import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/ui/navigation";
import { Home, Users, FileText, Euro, Plus, TrendingUp, AlertTriangle, Shield } from "lucide-react";

const LandlordDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProperties: 0,
    availableProperties: 0,
    activeLeases: 0,
    totalRents: 0,
    paidRents: 0,
    overdueRents: 0
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardStats = async () => {
    if (!user) return;

    try {
      // Load properties stats
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('status')
        .eq('owner_id', user.id);

      if (propertiesError) throw propertiesError;

      // Load leases stats
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('status')
        .eq('owner_id', user.id);

      if (leasesError) throw leasesError;

      // Load rents stats
      const { data: rents, error: rentsError } = await supabase
        .from('rents')
        .select('status, total_amount')
        .eq('owner_id', user.id);

      if (rentsError) throw rentsError;

      setStats({
        totalProperties: properties?.length || 0,
        availableProperties: properties?.filter(p => p.status === 'disponible').length || 0,
        activeLeases: leases?.filter(l => l.status === 'actif').length || 0,
        totalRents: rents?.length || 0,
        paidRents: rents?.filter(r => r.status === 'paye').length || 0,
        overdueRents: rents?.filter(r => r.status === 'en_retard').length || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
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
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Tableau de bord propriétaire
          </h1>
          <p className="text-muted-foreground">
            Gérez vos biens et suivez vos revenus locatifs
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Propriétés</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                {stats.availableProperties} disponible{stats.availableProperties > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Baux actifs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLeases}</div>
              <p className="text-xs text-muted-foreground">
                Contrats en cours
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loyers payés</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.paidRents}</div>
              <p className="text-xs text-muted-foreground">
                Sur {stats.totalRents} total
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impayés</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdueRents}</div>
              <p className="text-xs text-muted-foreground">
                À traiter
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2 text-primary" />
                Propriétés
              </CardTitle>
              <CardDescription>
                Gérez vos biens immobiliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href="/properties">
                    Voir mes propriétés
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="/properties?action=add">
                    <Plus className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Locataires
              </CardTitle>
              <CardDescription>
                Gérez vos locataires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href="/tenants">
                    Voir mes locataires
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="/tenants?action=add">
                    <Plus className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                Baux
              </CardTitle>
              <CardDescription>
                Gérez vos contrats de location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href="/leases">
                    Voir mes baux
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="/leases?action=add">
                    <Plus className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Euro className="w-5 h-5 mr-2 text-primary" />
                Loyers
              </CardTitle>
              <CardDescription>
                Suivez vos encaissements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href="/rents">
                    Voir les loyers
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="/rents?action=add">
                    <Plus className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                États des lieux
              </CardTitle>
              <CardDescription>
                Gérez vos documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href="/documents">
                    Voir les documents
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="/documents?action=add">
                    <Plus className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                Cautions
              </CardTitle>
              <CardDescription>
                Gérez les dépôts de garantie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href="/cautions">
                    Voir les cautions
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="/cautions">
                    <Plus className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        {stats.totalProperties === 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Premiers pas avec LocaManager</CardTitle>
              <CardDescription>
                Configurez votre espace de gestion locative en quelques étapes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Ajoutez vos propriétés</h4>
                      <p className="text-sm text-muted-foreground">Renseignez les informations de vos biens</p>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <a href="/properties?action=add">Commencer</a>
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Ajoutez vos locataires</h4>
                      <p className="text-sm text-muted-foreground">Enregistrez les informations de vos locataires</p>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <a href="/tenants?action=add">Ajouter</a>
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-semibold text-primary">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Créez vos baux</h4>
                      <p className="text-sm text-muted-foreground">Rédigez et signez vos contrats</p>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <a href="/leases?action=add">Créer</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LandlordDashboard;