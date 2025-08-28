import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Shield, Users, FileText, Building, Receipt, UserCheck, Calendar, Download, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-rental.jpg";

const Home = () => {
  const features = [
    {
      icon: Building,
      title: "Gestion des Propriétés",
      description: "Centralisez toutes vos propriétés avec leurs détails, photos et informations techniques."
    },
    {
      icon: UserCheck,
      title: "Gestion des Locataires",
      description: "Base de données complète de vos locataires avec historique et documents associés."
    },
    {
      icon: FileText,
      title: "Baux Électroniques",
      description: "Création, signature et gestion de baux entièrement dématérialisés et sécurisés."
    },
    {
      icon: Receipt,
      title: "Quittances Automatiques",
      description: "Génération automatique des quittances de loyer avec envoi par email."
    },
    {
      icon: Calendar,
      title: "États des Lieux",
      description: "États des lieux d'entrée et de sortie avec photos et signatures électroniques."
    },
    {
      icon: Download,
      title: "Documents Centralisés",
      description: "Stockage sécurisé de tous vos documents locatifs avec accès rapide."
    },
    {
      icon: Shield,
      title: "Sécurité Juridique",
      description: "Conformité légale avec signatures électroniques qualifiées et archivage sécurisé."
    },
    {
      icon: Users,
      title: "Interface Collaborative",
      description: "Espaces dédiés propriétaires et locataires pour une communication fluide."
    },
    {
      icon: Lock,
      title: "Données Protégées",
      description: "Chiffrement des données et conformité RGPD pour une sécurité maximale."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
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
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 text-lg"
                >
                  Commencer gratuitement
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
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

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">
              Toutes les fonctionnalités dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une solution complète pour simplifier la gestion locative et améliorer la relation propriétaire-locataire.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 text-foreground">
            Prêt à simplifier votre gestion locative ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de propriétaires qui font confiance à notre plateforme 
            pour gérer leurs biens immobiliers en toute sérénité.
          </p>
          <Link to="/auth">
            <Button size="lg" className="px-8 py-4 text-lg">
              Commencer maintenant
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;