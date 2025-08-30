import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, Users, FileText, DollarSign, Settings, LogOut, Shield, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Propriétés", href: "/properties", icon: Home },
    { name: "Locataires", href: "/tenants", icon: Users },
    { name: "Baux", href: "/leases", icon: FileText },
    { name: "États des lieux", href: "/inventories", icon: ClipboardList },
    { name: "Loyers", href: "/rents", icon: DollarSign },
    { name: "Cautions", href: "/cautions", icon: Shield },
    { name: "Paramètres", href: "/settings", icon: Settings },
];

  const location = useLocation();
  console.log('Navigation: Current pathname:', location.pathname);
  if (location.pathname.startsWith("/auth")) {
    console.log('Navigation: Hiding on auth page');
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">LocaManager</span>
            </div>
            
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Bonjour, {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </a>
              ))}
              <div className="flex flex-col space-y-2 pt-4">
                <span className="text-sm text-muted-foreground px-3">
                  {user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;