import { POSHeader } from "@/components/pos/POSHeader";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { OrderSidebar } from "@/components/pos/OrderSidebar";
import { Input } from "@/components/ui/input";
import { useClock } from "@/hooks/useClock";
import { products } from "@/data/products";
import { useState } from "react";
import { Search } from "lucide-react";

const Pos: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { formattedDate } = useClock();

    const filteredProducts = products.filter((product) => {
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <POSHeader />
            
            <div className="flex flex-1 overflow-hidden">
                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Welcome Section */}
                    <div className="p-4 pb-0">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="font-heading text-xl font-semibold text-foreground">
                                    Welcome, Wesley Adrian
                                </h1>
                                <p className="text-sm text-muted-foreground">{formattedDate}</p>
                            </div>
                            
                            {/* Search */}
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search Product"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-card"
                                />
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <CategoryTabs 
                            selectedCategory={selectedCategory} 
                            onCategoryChange={setSelectedCategory} 
                        />
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1 overflow-auto p-4 scrollbar-thin">
                        <ProductGrid products={filteredProducts} />
                    </div>
                </main>

                {/* Order Sidebar */}
                <OrderSidebar />
            </div>
        </div>
    );
};

export default Pos;