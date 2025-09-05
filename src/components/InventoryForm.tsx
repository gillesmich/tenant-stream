import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  photos: z.array(z.string()).default([])
});

const inventorySchema = z.object({
  propertyName: z.string().min(1, "Le nom de la propriété est requis"),
  propertyAddress: z.string().min(1, "L'adresse de la propriété est requise"),
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
  const [existingPhotos, setExistingPhotos] = useState<{ [key: number]: string[] }>({});
  const [deletedPhotos, setDeletedPhotos] = useState<string[]>([]); // Track photos to delete from storage
  const [properties, setProperties] = useState<any[]>([]);
  const { user } = useAuth();

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      propertyName: "",
      propertyAddress: "",
      date: new Date().toISOString().split('T')[0],
      type: "entree",
      rooms: defaultRooms.map(name => ({
        name,
        description: "",
        condition: "bon" as const,
        photos: []
      })),
      generalComments: "",
    }
  });

  // Load properties on component mount
  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, address')
        .eq('owner_id', user?.id);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  // Load initial data when component mounts or initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        propertyName: initialData.propertyName || "",
        propertyAddress: initialData.propertyAddress || "",
        date: initialData.date || new Date().toISOString().split('T')[0],
        type: initialData.type || "entree",
        rooms: initialData.rooms || defaultRooms.map(name => ({
          name,
          description: "",
          condition: "bon" as const,
          photos: []
        })),
        generalComments: initialData.generalComments || "",
      });

      // Load existing photos
      if (initialData.rooms) {
        const existingPhotosMap: { [key: number]: string[] } = {};
        initialData.rooms.forEach((room, index) => {
          if (room.photos && room.photos.length > 0) {
            existingPhotosMap[index] = room.photos;
          }
        });
        setExistingPhotos(existingPhotosMap);
      }
    }
  }, [initialData, form]);

  const handlePropertySelect = (propertyId: string) => {
    const selectedProperty = properties.find(p => p.id === propertyId);
    if (selectedProperty) {
      form.setValue('propertyId', propertyId);
      form.setValue('propertyName', selectedProperty.title);
      form.setValue('propertyAddress', selectedProperty.address);
    }
  };

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

  const removePhoto = (roomIndex: number, photoIndex: number, isExisting = false) => {
    if (isExisting) {
      // Remove from existing photos and add to deletion list
      const currentExisting = existingPhotos[roomIndex] || [];
      const photoToDelete = currentExisting[photoIndex];
      if (photoToDelete) {
        setDeletedPhotos(prev => [...prev, photoToDelete]);
      }
      
      const updatedExisting = currentExisting.filter((_, index) => index !== photoIndex);
      setExistingPhotos(prev => ({
        ...prev,
        [roomIndex]: updatedExisting
      }));
    } else {
      // Remove from new photo files
      const currentFiles = photoFiles[roomIndex] || [];
      const updatedFiles = currentFiles.filter((_, index) => index !== photoIndex);
      setPhotoFiles(prev => ({
        ...prev,
        [roomIndex]: updatedFiles
      }));
    }
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
    if (!user) {
      toast.error('Vous devez être connecté pour sauvegarder');
      return;
    }

    console.log('[InventoryForm] submit start', { roomsCount: data.rooms?.length, date: data.date, type: data.type });
    toast('Enregistrement en cours...');
    
    try {
      // Delete photos from storage that were marked for deletion
      for (const photoUrl of deletedPhotos) {
        try {
          // Extract file path from URL
          const urlParts = photoUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const userFolder = urlParts[urlParts.length - 2];
          const filePath = `${userFolder}/${fileName}`;
          
          const { error: deleteError } = await supabase.storage
            .from('inventory-photos')
            .remove([filePath]);
            
          if (deleteError) {
            console.error('Error deleting photo:', deleteError);
            // Continue anyway - don't block the save for deletion errors
          }
        } catch (deleteError) {
          console.error('Error parsing photo URL for deletion:', deleteError);
          // Continue anyway
        }
      }

      // Upload new photos to Supabase Storage and combine with existing photos
      const roomsWithPhotos = await Promise.all(data.rooms.map(async (room, roomIndex) => {
        const roomFiles = photoFiles[roomIndex] || [];
        const existingRoomPhotos = existingPhotos[roomIndex] || [];
        const uploadedPhotos = [];

        for (const file of roomFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('inventory-photos')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading photo:', uploadError);
            toast.error(`Erreur lors de l'upload de la photo: ${uploadError.message}`);
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('inventory-photos')
            .getPublicUrl(filePath);

          uploadedPhotos.push(urlData.publicUrl);
        }

        return {
          ...room,
          photos: [...existingRoomPhotos, ...uploadedPhotos]
        };
      }));

      // Reset all photo states after successful upload
      setPhotoFiles({});
      setExistingPhotos({});
      setDeletedPhotos([]);

      onSubmit({
        ...data,
        rooms: roomsWithPhotos
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
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
            <CardContent className="grid gap-4">
              <div className="space-y-4">
                <Label>Sélectionner une propriété</Label>
                <Select onValueChange={handlePropertySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir dans mes propriétés" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Ou remplissez manuellement les champs ci-dessous
                </p>
              </div>

              <FormField
                control={form.control}
                name="propertyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la propriété</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Appartement T3, Villa..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="propertyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de la propriété</FormLabel>
                    <FormControl>
                      <Input placeholder="Adresse complète du bien" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>
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
                      
                      {/* Existing Photos Preview */}
                      {existingPhotos[index] && existingPhotos[index].length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="col-span-3 text-xs text-muted-foreground mb-2">Photos existantes:</div>
                          {existingPhotos[index].map((photoUrl, photoIndex) => (
                            <div key={`existing-${photoIndex}`} className="relative group">
                              <img
                                src={photoUrl}
                                alt={`Photo existante ${photoIndex + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePhoto(index, photoIndex, true)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Photos Preview */}
                      {photoFiles[index] && photoFiles[index].length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="col-span-3 text-xs text-muted-foreground mb-2">Nouvelles photos:</div>
                          {photoFiles[index].map((file, photoIndex) => (
                            <div key={`new-${photoIndex}`} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Nouvelle photo ${photoIndex + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePhoto(index, photoIndex, false)}
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
            <Button type="button" variant="outline" onClick={() => { 
              form.reset({
                propertyName: "",
                propertyAddress: "",
                date: new Date().toISOString().split('T')[0],
                type: "entree",
                rooms: defaultRooms.map(name => ({
                  name,
                  description: "",
                  condition: "bon" as const,
                  photos: []
                })),
                generalComments: "",
              }); 
              setPhotoFiles({}); 
              setExistingPhotos({}); 
              setDeletedPhotos([]); 
              toast.info('Formulaire réinitialisé'); 
              onCancel?.(); 
            }}>
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