import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, FileText } from "lucide-react";
import heroImage from "@/assets/hero-rental.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Gestion locative moderne" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/80"></div>
      </div>
      
      <div className="container mx-auto px-4 py-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Gestion Locative
            <span className="block bg-gradient-to-r from-accent to-success bg-clip-text text-transparent">
              Simplifiée
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
            La plateforme complète pour propriétaires et locataires. 
            Gérez vos baux, états des lieux, loyers et documents en toute simplicité.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 text-lg"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 py-4 text-lg"
            >
              Voir la démo
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sécurisé</h3>
              <p className="text-primary-foreground/80">Signatures électroniques et stockage sécurisé</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Collaboratif</h3>
              <p className="text-primary-foreground/80">Interface dédiée propriétaires/locataires</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Complet</h3>
              <p className="text-primary-foreground/80">Baux, états des lieux, quittances automatiques</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;