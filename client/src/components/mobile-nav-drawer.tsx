import { Link, useLocation } from "wouter";
import { Compass, Wrench, Brain, Map, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    name: "Conversation",
    path: "/",
    icon: Compass,
    description: "Chat with the knowledge agent"
  },
  {
    name: "Launchpad",
    path: "/workshop",
    icon: Wrench,
    description: "Interactive tools and utilities"
  },
  {
    name: "Quiz",
    path: "/quiz",
    icon: Brain,
    description: "Test your knowledge"
  },
  {
    name: "Atlas",
    path: "/atlas",
    icon: Map,
    description: "Knowledge map and resources"
  }
];

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        data-testid="mobile-menu-backdrop"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 md:hidden transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="mobile-menu-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Navigation</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-9 h-9"
            data-testid="button-close-menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col p-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <div
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                  data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs opacity-70">{item.description}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
