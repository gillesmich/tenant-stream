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
  onTemplateSelect: (templateUrl: string | null) => void;
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'lease_template')
        .order('created_at', { ascending: false });

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
      // Upload file to Supabase Storage
      const fileName = `lease_template_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save template record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: file.name.replace('.pdf', ''),
          document_type: 'lease_template',
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          owner_id: user.id,
        });

      if (insertError) throw insertError;

      toast({
        title: "Succès",
        description: "Template uploadé avec succès",
      });

      loadTemplates();
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
      const fileName = template.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('documents')
          .remove([fileName]);
      }

      toast({
        title: "Succès",
        description: "Template supprimé",
      });

      loadTemplates();
      if (selectedTemplate === template.file_url) {
        onTemplateSelect(null);
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
              <Label htmlFor="template-upload" className="cursor-pointer">
                <Input
                  id="template-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingFile(file);
                    }
                  }}
                />
                <Button variant="outline" disabled={loading}>
                  Choisir un template PDF
                </Button>
              </Label>
              {uploadingFile && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{uploadingFile.name}</span>
                  <Button
                    size="sm"
                    onClick={() => uploadTemplate(uploadingFile)}
                    disabled={loading}
                  >
                    Upload
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUploadingFile(null)}
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
              onClick={() => onTemplateSelect(null)}
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
                    onClick={() => onTemplateSelect(
                      selectedTemplate === template.file_url ? null : template.file_url
                    )}
                  >
                    {selectedTemplate === template.file_url ? "Sélectionné" : "Utiliser"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(template.file_url, '_blank')}
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