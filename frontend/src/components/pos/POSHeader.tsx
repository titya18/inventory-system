import { useClock } from "@/hooks/useClock";
import { 
  LayoutDashboard, 
  Maximize2, 
  Settings, 
  Bell, 
  User,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const POSHeader = () => {
  const { formattedTime } = useClock();

  return (
    <header className="h-14 bg-accent flex items-center justify-between px-4 shadow-md">
      {/* Logo and Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-success flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="text-accent-foreground font-heading font-bold text-lg">
            QuickPOS
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-success px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-success-foreground animate-pulse-subtle" />
          <span className="text-success-foreground text-sm font-medium">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button 
          variant="warning" 
          size="sm" 
          className="gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Button>
        <Button 
          variant="success" 
          size="sm" 
          className="gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Freshmart
        </Button>
      </div>

      {/* Icon Actions */}
      <div className="flex items-center gap-1">
        {[
          { icon: LayoutDashboard, label: "Grid" },
          { icon: Maximize2, label: "Fullscreen" },
          { icon: Settings, label: "Settings" },
          { icon: Bell, label: "Notifications" },
        ].map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            size="icon"
            className="text-accent-foreground/70 hover:text-accent-foreground hover:bg-accent-foreground/10"
          >
            <item.icon className="w-5 h-5" />
          </Button>
        ))}
        
        <Button
          variant="ghost"
          size="icon"
          className="ml-2"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center">
            <User className="w-4 h-4 text-accent-foreground" />
          </div>
        </Button>
      </div>
    </header>
  );
};
