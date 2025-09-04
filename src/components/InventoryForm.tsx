import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const roomConditions = [
  { value: "neuf", label: "Neuf" },
  { value: "bon", label: "Bon état" },
  { value: "moyen", label: "État moyen" },
  { value: "mauvais", label: "Mauvais état" }
] as const;

const defaultRooms = [
  "Salon",
  "Cuisine",
  "Chambre 1",
  "Chambre 2", 
  "Salle de bain",
  "WC",
  "Entrée",
  "Couloir"
];

const roomSchema = z.object({
  name: z.string().min(1, "Le nom de la pièce est requis"),
  description: z.string().default(""),
  condition: z.enum(["neuf", "bon", "moyen", "mauvais"]).default("bon"),
  photos: z.union([z.array(z.instanceof(File)), z.array(z.string())]).default([])
});

const inventorySchema = z.object({
  propertyId: z.string().nullable().optional(),
  date: z.string().min(1, "La date est requise"),
  type: z.enum(["entree", "sortie"]).default("entree"),
  rooms: z.array(roomSchema).min(1, "Au moins une pièce est requise"),
  generalComments: z.string().default("")
});

type InventoryFormData = z.infer<typeof inventorySchema>;

interface InventoryFormProps {
  onSubmit: (data: any) => void;
  initialData?: Partial<InventoryFormData>;
  onCancel?: () => void;
}

export function InventoryForm({ onSubmit, initialData, onCancel }: InventoryFormProps) {
  const [photoFiles, setPhotoFiles] = useState<{ [key: number]: File[] }>({});
  const { user } = useAuth();

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: "entree",
      rooms: defaultRooms.map(name => ({
        name,
        description: "",
        condition: "bon" as const,
        photos: []
      })),
      generalComments: "",
      ...initialData
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rooms"
  });

  const handlePhotoUpload = (roomIndex: number, files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setPhotoFiles(prev => ({
        ...prev,
        [roomIndex]: [...(prev[roomIndex] || []), ...newFiles]
      }));
      
      const currentPhotos = form.getValues(`rooms.${roomIndex}.photos`) || [];
      // Don't set form value here as we manage files separately
    }
  };

  const removePhoto = (roomIndex: number, photoIndex: number) => {
    const currentFiles = photoFiles[roomIndex] || [];
    const updatedFiles = currentFiles.filter((_, index) => index !== photoIndex);
    
    setPhotoFiles(prev => ({
      ...prev,
      [roomIndex]: updatedFiles
    }));
    
    // Don't set form value here as we manage files separately
  };

  const addRoom = () => {
    append({
      name: "",
      description: "",
      condition: "bon",
      photos: []
    });
  };

  const handleSubmit = async (data: InventoryFormData) => {
    if (!user) return;

    // Debug: vérifie que la soumission se déclenche
    console.log('[InventoryForm] submit start', { roomsCount: data.rooms?.length, date: data.date, type: data.type });
    toast('Enregistrement en cours...');
    
    // Upload photos et conserve celles existantes
    const roomsWithPhotos = await Promise.all(
      data.rooms.map(async (room, index) => {
        const newPhotos = photoFiles[index] || [];

        const uploadedUrls = await Promise.all(
          newPhotos.map(async (photo) => {
            const fileName = `${Date.now()}-${photo.name}`;
            const filePath = `${user.id}/${fileName}`;
            
            const { error } = await supabase.storage
              .from('inventory-photos')
              .upload(filePath, photo);
            
            if (error) {
              console.error('Upload error:', error);
              toast.error('Erreur lors de l\'upload d\'une photo');
              return null;
            }
            
            const { data: { publicUrl } } = supabase.storage
              .from('inventory-photos')
              .getPublicUrl(filePath);
              
            return publicUrl;
          })
        );
        
        // Conserver les anciennes URLs si présentes
        const existing = Array.isArray(room.photos)
          ? (room.photos as unknown[]).filter((p): p is string => typeof p === 'string')
          : [];

        return {
          ...room,
          photos: [...existing, ...uploadedUrls.filter((url): url is string => !!url)]
        };
      })
    );

    const formDataWithPhotos = {
      ...data,
      rooms: roomsWithPhotos
    };
    
    console.log('[InventoryForm] submit ready, forwarding to parent');
    // Important: retourner/attendre la promesse pour que RHF gère isSubmitting correctement
    return Promise.resolve(onSubmit(formDataWithPhotos));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">État des lieux</h1>
        <p className="text-muted-foreground mt-2">
          Documentez l'état de chaque pièce avec photos et commentaires
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit, (errors) => { console.log('[InventoryForm] validation errors', errors); toast.error('Formulaire invalide. Corrigez les champs en rouge.'); })} className="space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'état des lieux</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="entree" id="entree" />
                          <Label htmlFor="entree">Entrée</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sortie" id="sortie" />
                          <Label htmlFor="sortie">Sortie</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Rooms */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Pièces</h2>
              <Button type="button" onClick={addRoom} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une pièce
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      Pièce {index + 1}
                    </CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`rooms.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la pièce</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Salon, Cuisine..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`rooms.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description/Commentaires</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Décrivez l'état général, les détails remarquables..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`rooms.${index}.condition`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>État de la pièce</FormLabel>
                        <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                            {roomConditions.map((condition) => (
                              <div key={condition.value} className="flex items-center space-x-2">
                                <RadioGroupItem value={condition.value} id={`${index}-${condition.value}`} />
                                <Label htmlFor={`${index}-${condition.value}`}>{condition.label}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label>Photos</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      <div className="text-center">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <Label htmlFor={`photos-${index}`} className="cursor-pointer">
                          <span className="text-sm text-muted-foreground">
                            Cliquez pour ajouter des photos
                          </span>
                          <Input
                            id={`photos-${index}`}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(index, e.target.files)}
                          />
                        </Label>
                      </div>
                      
                      {/* Photo Preview */}
                      {photoFiles[index] && photoFiles[index].length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {photoFiles[index].map((file, photoIndex) => (
                            <div key={photoIndex} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Photo ${photoIndex + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePhoto(index, photoIndex)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* General Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Commentaires généraux</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="generalComments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observations générales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Commentaires généraux sur l'état du logement..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => { form.reset(); toast.info('Modification annulée'); onCancel?.(); }}>
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Enregistrer l'état des lieux
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}