import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Home,
  Building2,
  FileText,
  CreditCard,
  Users,
  FolderOpen,
  Shield,
  Search,
} from "lucide-react";

const commands = [
  {
    group: "Navigation",
    items: [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: Home,
        action: "/dashboard",
      },
      {
        id: "properties",
        label: "Propriétés",
        icon: Building2,
        action: "/properties",
      },
      {
        id: "leases",
        label: "Baux",
        icon: FileText,
        action: "/leases",
      },
      {
        id: "rents",
        label: "Loyers",
        icon: CreditCard,
        action: "/rents",
      },
      {
        id: "tenants",
        label: "Locataires",
        icon: Users,
        action: "/tenants",
      },
      {
        id: "documents",
        label: "Documents",
        icon: FolderOpen,
        action: "/documents",
      },
      {
        id: "cautions",
        label: "Demandes de caution",
        icon: Shield,
        action: "/cautions",
      },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (value: string) => {
    const command = commands
      .flatMap((group) => group.items)
      .find((item) => item.id === value);
    
    if (command) {
      navigate(command.action);
      setOpen(false);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tapez une commande ou recherchez..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={handleSelect}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.id === "dashboard" && (
                    <CommandShortcut>/</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}