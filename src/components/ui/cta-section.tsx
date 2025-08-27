import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const CTASection = () => {
  const benefits = [
    "Essai gratuit 30 jours",
    "Configuration assistée",
    "Support client inclus",
    "Sans engagement"
  ];

  return (
    <section className="py-24 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à simplifier votre gestion locative ?
          </h2>
          
          <p className="text-xl mb-8 text-primary-foreground/90">
            Rejoignez des milliers de propriétaires qui font confiance à LocaManager
          </p>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 py-4 text-lg"
            >
              Créer mon compte gratuit
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 py-4 text-lg"
            >
              Planifier une démo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;