import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LeaseFormProps {
  lease?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const LeaseForm = ({ lease, onSuccess, onCancel }: LeaseFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    startDate: "",
    endDate: "",
    rentAmount: "",
    chargesAmount: "",
    depositAmount: "",
    leaseType: "",
    notes: ""
  });

  useEffect(() => {
    if (user) {
      loadPropertiesAndTenants();
    }
    
    if (lease) {
      setFormData({
        propertyId: lease.property_id || "",
        tenantId: lease.tenant_id || "",
        startDate: lease.start_date || "",
        endDate: lease.end_date || "",
        rentAmount: lease.rent_amount?.toString() || "",
        chargesAmount: lease.charges_amount?.toString() || "",
        depositAmount: lease.deposit_amount?.toString() || "",
        leaseType: lease.lease_type || "",
        notes: lease.notes || ""
      });
    }
  }, [user, lease]);

  const loadPropertiesAndTenants = async () => {
    if (!user) return;

    try {
      const [propertiesRes, tenantsRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, address, city')
          .eq('owner_id', user.id)
          .eq('status', 'disponible'),
        supabase
          .from('tenants')
          .select('id, first_name, last_name, email')
          .eq('owner_id', user.id)
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (tenantsRes.error) throw tenantsRes.error;

      setProperties(propertiesRes.data || []);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const leaseData = {
        property_id: formData.propertyId,
        tenant_id: formData.tenantId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        rent_amount: parseFloat(formData.rentAmount),
        charges_amount: formData.chargesAmount ? parseFloat(formData.chargesAmount) : 0,
        deposit_amount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
        lease_type: formData.leaseType,
        notes: formData.notes,
        owner_id: user.id,
        status: 'brouillon'
      };

      if (lease) {
        const { error } = await supabase
          .from('leases')
          .update(leaseData)
          .eq('id', lease.id);

        if (error) throw error;

        toast({
          title: "Bail modifié",
          description: "Le bail a été mis à jour avec succès",
        });
      } else {
        const { error } = await supabase
          .from('leases')
          .insert([leaseData]);

        if (error) throw error;

        // Mettre à jour le statut de la propriété
        await supabase
          .from('properties')
          .update({ status: 'occupé' })
          .eq('id', formData.propertyId);

        toast({
          title: "Bail créé",
          description: "Le nouveau bail a été créé avec succès",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {lease ? 'Modifier le bail' : 'Nouveau bail'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Propriété *</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une propriété" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title} - {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant">Locataire *</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Loyer (€) *</Label>
              <Input
                id="rentAmount"
                type="number"
                step="0.01"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chargesAmount">Charges (€)</Label>
              <Input
                id="chargesAmount"
                type="number"
                step="0.01"
                value={formData.chargesAmount}
                onChange={(e) => setFormData({ ...formData, chargesAmount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositAmount">Dépôt de garantie (€)</Label>
              <Input
                id="depositAmount"
                type="number"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaseType">Type de bail *</Label>
            <Select
              value={formData.leaseType}
              onValueChange={(value) => setFormData({ ...formData, leaseType: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vide">Logement vide</SelectItem>
                <SelectItem value="meuble">Logement meublé</SelectItem>
                <SelectItem value="commercial">Bail commercial</SelectItem>
                <SelectItem value="professionnel">Bail professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : (lease ? 'Modifier' : 'Créer le bail')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};