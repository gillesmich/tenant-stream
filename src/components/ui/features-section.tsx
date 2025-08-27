import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileSignature, 
  Camera, 
  Mail, 
  AlertTriangle, 
  Home, 
  Calculator,
  Download,
  Calendar
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: FileSignature,
      title: "Signature électronique",
      description: "Signez vos baux et documents légaux en ligne, valeur juridique garantie"
    },
    {
      icon: Camera,
      title: "États des lieux digitaux",
      description: "Créez des états des lieux détaillés avec photos géolocalisées"
    },
    {
      icon: Mail,
      title: "Envoi automatique",
      description: "Quittances de loyer et avis d'échéance envoyés automatiquement"
    },
    {
      icon: AlertTriangle,
      title: "Relances impayés",
      description: "Système automatique de relances personnalisables"
    },
    {
      icon: Home,
      title: "Gestion multi-biens",
      description: "Gérez tous vos biens immobiliers depuis une seule interface"
    },
    {
      icon: Calculator,
      title: "Calculs automatiques",
      description: "Charges, révisions de loyer et indexations automatiques"
    },
    {
      icon: Download,
      title: "Export PDF",
      description: "Générez tous vos documents au format PDF professionnel"
    },
    {
      icon: Calendar,
      title: "Planification",
      description: "Calendrier des échéances et notifications intelligentes"
    }
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une suite complète d'outils pour simplifier votre gestion locative
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;