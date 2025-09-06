import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Download, Trash2, FileText } from 'lucide-react';

interface PDFTemplate {
  id: string;
  title: string;
  file_url: string;
  created_at: string;
}

interface PDFTemplateManagerProps {
  onTemplateSelect: (templateUrl: string | null, templateName?: string | null) => void;
  selectedTemplate: string | null;
}

export const PDFTemplateManager = ({ onTemplateSelect, selectedTemplate }: PDFTemplateManagerProps) => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const query = supabase
        .from('documents')
        .select('*')
        .in('document_type', ['lease_template', 'autre'])
        .order('created_at', { ascending: false });

      const { data, error } = userId
        ? await query.eq('owner_id', userId)
        : await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les templates",
        variant: "destructive",
      });
    }
  };

  const uploadTemplate = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: "Format invalide",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Upload file to Supabase Storage with user folder structure
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileName = `${user.id}/lease_template_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Enregistrer un enregistrement de document (chemin stocké, bucket privé)
      const filePath = fileName; // chemin dans le bucket 'documents'

      const { data: inserted, error: insertError } = await supabase
        .from('documents')
        .insert({
          title: file.name.replace(/\.pdf$/i, ''),
          document_type: 'lease_template',
          file_name: file.name,
          file_url: filePath,
          file_size: file.size,
          mime_type: file.type,
          owner_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Sélectionner automatiquement le template nouvellement uploadé
      onTemplateSelect(inserted.file_url, inserted.title);

      toast({
        title: "Succès",
        description: `Template "${inserted.title}" uploadé et sélectionné`,
      });

      await loadTemplates();
      setUploadingFile(null);
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

  const deleteTemplate = async (template: PDFTemplate) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

    // Also delete from storage
    const filePath = template.file_url;
    await supabase.storage
      .from('documents')
      .remove([filePath]);

      toast({
        title: "Succès",
        description: "Template supprimé",
      });

      loadTemplates();
      if (selectedTemplate === template.file_url) {
        onTemplateSelect(null, null);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le template",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Templates PDF de Bail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload section */}
        <div className="border-2 border-dashed border-muted rounded-lg p-4">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <div className="space-y-2">
              <div>
                <Input
                  id="template-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    console.log('File input changed:', e.target.files);
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('File selected:', file.name, file.type);
                      setUploadingFile(file);
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  disabled={loading} 
                  type="button"
                  onClick={() => {
                    console.log('Button clicked, triggering file input');
                    document.getElementById('template-upload')?.click();
                  }}
                >
                  Choisir un template PDF
                </Button>
              </div>
              {uploadingFile && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">{uploadingFile.name}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      console.log('Upload button clicked');
                      uploadTemplate(uploadingFile);
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Upload...' : 'Upload'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUploadingFile(null)}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Templates list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Templates disponibles</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTemplateSelect(null, null)}
              className={selectedTemplate === null ? "bg-muted" : ""}
            >
              Générer PDF classique
            </Button>
          </div>
          
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun template disponible</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  selectedTemplate === template.file_url ? 'bg-muted border-primary' : ''
                }`}
              >
                <div className="flex-1">
                  <h5 className="font-medium">{template.title}</h5>
                  <p className="text-sm text-muted-foreground">
                    {new Date(template.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedTemplate === template.file_url ? "default" : "outline"}
                    onClick={() => {
                      console.log('Template sélectionné:', template.file_url, template.title);
                      onTemplateSelect(template.file_url, template.title);
                    }}
                  >
                    {selectedTemplate === template.file_url ? "Sélectionné" : "Utiliser"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('documents')
                          .createSignedUrl(template.file_url, 600);
                        if (error) throw error;
                        if (data?.signedUrl) {
                          window.open(data.signedUrl, '_blank');
                        }
                      } catch (e: any) {
                        toast({ title: 'Erreur', description: "Impossible d'ouvrir le template", variant: 'destructive' });
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTemplate(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};