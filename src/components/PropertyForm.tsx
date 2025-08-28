import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface PropertyFormData {
  title: string;
  address: string;
  city: string;
  postal_code: string;
  property_type: string;
  surface?: number;
  rooms?: number;
  bedrooms?: number;
  furnished: boolean;
  rent_amount: number;
  charges_amount?: number;
  deposit_amount?: number;
  description?: string;
  available_date?: string;
}

interface PropertyFormProps {
  property?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const PropertyForm = ({ property, onSuccess, onCancel }: PropertyFormProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PropertyFormData>({
    defaultValues: property ? {
      title: property.title,
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      property_type: property.property_type,
      surface: property.surface,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      furnished: property.furnished,
      rent_amount: property.rent_amount,
      charges_amount: property.charges_amount,
      deposit_amount: property.deposit_amount,
      description: property.description,
      available_date: property.available_date
    } : {
      furnished: false,
      rent_amount: 0
    }
  });

  const onSubmit = async (data: PropertyFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const propertyData = {
        ...data,
        owner_id: user.id,
        status: 'disponible'
      };

      if (property) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id)
          .eq('owner_id', user.id);

        if (error) throw error;

        toast({
          title: "Propriété modifiée",
          description: "Les informations de la propriété ont été mises à jour.",
        });
      } else {
        // Create new property
        const { error } = await supabase
          .from('properties')
          .insert(propertyData);

        if (error) throw error;

        toast({
          title: "Propriété ajoutée",
          description: "La nouvelle propriété a été ajoutée avec succès.",
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{property ? "Modifier la propriété" : "Ajouter une propriété"}</CardTitle>
        <CardDescription>
          {property ? "Modifiez les informations de votre propriété" : "Ajoutez une nouvelle propriété à votre portefeuille"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Titre de l'annonce</Label>
              <Input
                id="title"
                {...register("title", { required: "Le titre est requis" })}
                placeholder="Ex: Appartement 3 pièces centre-ville"
              />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                {...register("address", { required: "L'adresse est requise" })}
                placeholder="Ex: 15 rue de la République"
              />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
            </div>

            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                {...register("city", { required: "La ville est requise" })}
                placeholder="Ex: Paris"
              />
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
            </div>

            <div>
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                {...register("postal_code", { required: "Le code postal est requis" })}
                placeholder="Ex: 75001"
              />
              {errors.postal_code && <p className="text-sm text-destructive mt-1">{errors.postal_code.message}</p>}
            </div>

            <div>
              <Label htmlFor="property_type">Type de bien</Label>
              <Select onValueChange={(value) => setValue("property_type", value)} defaultValue={property?.property_type}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">Appartement</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="loft">Loft</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="surface">Surface (m²)</Label>
              <Input
                id="surface"
                type="number"
                {...register("surface", { valueAsNumber: true })}
                placeholder="Ex: 65"
              />
            </div>

            <div>
              <Label htmlFor="rooms">Nombre de pièces</Label>
              <Input
                id="rooms"
                type="number"
                {...register("rooms", { valueAsNumber: true })}
                placeholder="Ex: 3"
              />
            </div>

            <div>
              <Label htmlFor="bedrooms">Nombre de chambres</Label>
              <Input
                id="bedrooms"
                type="number"
                {...register("bedrooms", { valueAsNumber: true })}
                placeholder="Ex: 2"
              />
            </div>

            <div>
              <Label htmlFor="rent_amount">Loyer (€)</Label>
              <Input
                id="rent_amount"
                type="number"
                {...register("rent_amount", { required: "Le loyer est requis", valueAsNumber: true })}
                placeholder="Ex: 1200"
              />
              {errors.rent_amount && <p className="text-sm text-destructive mt-1">{errors.rent_amount.message}</p>}
            </div>

            <div>
              <Label htmlFor="charges_amount">Charges (€)</Label>
              <Input
                id="charges_amount"
                type="number"
                {...register("charges_amount", { valueAsNumber: true })}
                placeholder="Ex: 150"
              />
            </div>

            <div>
              <Label htmlFor="deposit_amount">Dépôt de garantie (€)</Label>
              <Input
                id="deposit_amount"
                type="number"
                {...register("deposit_amount", { valueAsNumber: true })}
                placeholder="Ex: 2400"
              />
            </div>

            <div>
              <Label htmlFor="available_date">Date de disponibilité</Label>
              <Input
                id="available_date"
                type="date"
                {...register("available_date")}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Décrivez votre propriété..."
                rows={4}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="furnished"
                  {...register("furnished")}
                  className="rounded"
                />
                <Label htmlFor="furnished">Meublé</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : property ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PropertyForm;