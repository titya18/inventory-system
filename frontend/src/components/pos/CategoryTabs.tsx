import { categories } from "@/data/products";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Headphones, 
  Footprints, 
  Smartphone, 
  Watch, 
  Laptop,
  Cpu,
  Gem
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  grid: LayoutGrid,
  headphones: Headphones,
  shoe: Footprints,
  smartphone: Smartphone,
  watch: Watch,
  laptop: Laptop,
  cpu: Cpu,
  gem: Gem,
};

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryTabs = ({ selectedCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] || LayoutGrid;
        const isActive = selectedCategory === category.id;
        
        return (
          <Button
            key={category.id}
            variant={isActive ? "categoryActive" : "category"}
            size="sm"
            className="gap-2 px-4"
            onClick={() => onCategoryChange(category.id)}
          >
            <Icon className="w-4 h-4" />
            {category.name}
          </Button>
        );
      })}
    </div>
  );
};
