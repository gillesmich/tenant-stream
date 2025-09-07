import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/ui/navigation";
import { User, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const TenantProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'France'
  });

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Charger le profil principal
      const { data: mainProfile, error: mainError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (mainError) {
        console.error('Error loading main profile:', mainError);
      }

      // Charger le profil locataire s'il existe
      const { data: tenantProfile, error: tenantError } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tenantError) {
        console.error('Error loading tenant profile:', tenantError);
      }

      // Fusionner les données
      setProfile({
        first_name: tenantProfile?.first_name || mainProfile?.first_name || '',
        last_name: tenantProfile?.last_name || mainProfile?.last_name || '',
        email: tenantProfile?.email || mainProfile?.email || '',
        phone: tenantProfile?.phone || mainProfile?.phone || '',
        gender: tenantProfile?.gender || '',
        address_line1: tenantProfile?.address_line1 || mainProfile?.address_line1 || '',
        address_line2: tenantProfile?.address_line2 || mainProfile?.address_line2 || '',
        city: tenantProfile?.city || mainProfile?.city || '',
        postal_code: tenantProfile?.postal_code || mainProfile?.postal_code || '',
        country: tenantProfile?.country || mainProfile?.country || 'France'
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Mettre à jour le profil principal avec UPDATE
      const { error: mainError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (mainError) {
        console.error('Main profile update error:', mainError);
        throw mainError;
      }

      // Mettre à jour ou créer le profil locataire
      const { error: tenantUpdateError } = await supabase
        .from('tenant_profiles')
        .upsert({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          gender: profile.gender,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country,
          updated_at: new Date().toISOString()
        });

      if (tenantUpdateError) {
        console.error('Tenant profile update error:', tenantUpdateError);
        // Ne pas bloquer pour l'erreur tenant profile car c'est optionnel
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder votre profil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    loadProfile();
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
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/tenant-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Mon profil locataire
          </h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Mettez à jour vos informations de contact et d'adresse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Votre prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Genre</Label>
              <Select value={profile.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Monsieur</SelectItem>
                  <SelectItem value="F">Madame</SelectItem>
                  <SelectItem value="Other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="0123456789"
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Adresse de correspondance</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address_line1">Adresse ligne 1 *</Label>
                <Input
                  id="address_line1"
                  value={profile.address_line1}
                  onChange={(e) => handleInputChange('address_line1', e.target.value)}
                  placeholder="Numéro et nom de rue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Adresse ligne 2</Label>
                <Input
                  id="address_line2"
                  value={profile.address_line2}
                  onChange={(e) => handleInputChange('address_line2', e.target.value)}
                  placeholder="Complément d'adresse (optionnel)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal *</Label>
                  <Input
                    id="postal_code"
                    value={profile.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="75000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={profile.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="France"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer mes informations'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantProfile;