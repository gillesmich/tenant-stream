import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/ui/navigation";
import { FileText, Plus, Edit, Trash2, Download, PenTool, Clock, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    documentType: "",
    propertyId: "",
    leaseId: "",
    fileUrl: ""
  });

  const { toast } = useToast();

  const documentTypes = [
    { value: "bail", label: "Contrat de location" },
    { value: "etat_lieux_entree", label: "État des lieux d'entrée" },
    { value: "etat_lieux_sortie", label: "État des lieux de sortie" },
    { value: "quittance_loyer", label: "Quittance de loyer" },
    { value: "justificatif_paiement", label: "Justificatif de paiement" },
    { value: "courrier", label: "Courrier" },
    { value: "autre", label: "Autre" }
  ];

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          properties (title, address),
          leases (start_date, end_date)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPropertiesAndLeases = async () => {
    if (!user) return;

    try {
      const [propertiesRes, leasesRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id, title, address')
          .eq('owner_id', user.id),
        supabase
          .from('leases')
          .select('id, start_date, end_date, property_id, properties(title)')
          .eq('owner_id', user.id)
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (leasesRes.error) throw leasesRes.error;

      setProperties(propertiesRes.data || []);
      setLeases(leasesRes.data || []);
    } catch (error) {
      console.error('Error loading properties and leases:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      documentType: "",
      propertyId: "",
      leaseId: "",
      fileUrl: ""
    });
    setEditingDocument(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const documentData = {
        title: formData.title,
        document_type: formData.documentType,
        property_id: formData.propertyId || null,
        lease_id: formData.leaseId || null,
        file_url: formData.fileUrl || null,
        owner_id: user.id
      };

      if (editingDocument) {
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', editingDocument.id);

        if (error) throw error;

        toast({
          title: "Document modifié",
          description: "Le document a été mis à jour avec succès",
        });
      } else {
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);

        if (error) throw error;

        toast({
          title: "Document ajouté",
          description: "Le nouveau document a été créé avec succès",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (document: any) => {
    setEditingDocument(document);
    setFormData({
      title: document.title || "",
      documentType: document.document_type || "",
      propertyId: document.property_id || "",
      leaseId: document.lease_id || "",
      fileUrl: document.file_url || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès",
      });

      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadDocuments();
    loadPropertiesAndLeases();
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Documents
            </h1>
            <p className="text-muted-foreground">
              Gérez vos documents et états des lieux
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? 'Modifier le document' : 'Ajouter un nouveau document'}
                </DialogTitle>
                <DialogDescription>
                  Renseignez les informations du document
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentType">Type de document *</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property">Propriété (optionnel)</Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une propriété" />
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
                  <Label htmlFor="lease">Bail (optionnel)</Label>
                  <Select
                    value={formData.leaseId}
                    onValueChange={(value) => setFormData({ ...formData, leaseId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un bail" />
                    </SelectTrigger>
                    <SelectContent>
                      {leases.map((lease) => (
                        <SelectItem key={lease.id} value={lease.id}>
                          {lease.properties?.title} - {new Date(lease.start_date).toLocaleDateString('fr-FR')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileUrl">URL du fichier</Label>
                  <Input
                    id="fileUrl"
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingDocument ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {documents.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter vos premiers documents
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Card key={doc.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {doc.title}
                    </span>
                    <div className="flex gap-1">
                      {doc.signed ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <PenTool className="w-3 h-3 mr-1" />
                          Signé
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Non signé
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {doc.properties && (
                      <div className="text-sm">
                        <strong>Propriété:</strong> {doc.properties.title}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      Créé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    
                    {doc.signed && doc.signed_at && (
                      <div className="text-sm text-success">
                        Signé le {new Date(doc.signed_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      {doc.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </a>
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(doc)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;