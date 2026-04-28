interface Category { id: number | string; name: string; }

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  productCounts?: Record<string, number>;
}

export const CategoryTabs = ({ categories, selectedCategory, onCategoryChange, productCounts = {} }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 flex-nowrap min-w-0">
      {categories.map((cat) => {
        const isActive = selectedCategory === String(cat.id);
        const count = productCounts[String(cat.id)] ?? 0;

        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(String(cat.id))}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {cat.name}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
