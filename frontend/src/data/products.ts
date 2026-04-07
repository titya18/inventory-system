import airpods from "@/assets/products/airpods.jpg";
import iphone from "@/assets/products/iphone.jpg";
import watch from "@/assets/products/watch.jpg";
import laptop from "@/assets/products/laptop.jpg";
import headphones from "@/assets/products/headphones.jpg";
import shoes from "@/assets/products/shoes.jpg";
import samsung from "@/assets/products/samsung.jpg";
import vacuum from "@/assets/products/vacuum.jpg";
import bracelet from "@/assets/products/bracelet.jpg";
import perfume from "@/assets/products/perfume.jpg";
import mouse from "@/assets/products/mouse.jpg";
import cable from "@/assets/products/cable.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

export const products: Product[] = [
  { id: "1", name: "Apple AirPods Pro", price: 249, stock: 25, category: "headphones", image: airpods },
  { id: "2", name: "iPhone 15 Pro", price: 999, stock: 18, category: "mobiles", image: iphone },
  { id: "3", name: "Apple Watch Series 9", price: 399, stock: 35, category: "watches", image: watch },
  { id: "4", name: "MacBook Pro 16\"", price: 2499, stock: 12, category: "laptops", image: laptop },
  { id: "5", name: "Sony WH-1000XM5", price: 349, stock: 22, category: "headphones", image: headphones },
  { id: "6", name: "Nike Air Max", price: 179, stock: 40, category: "shoes", image: shoes },
  { id: "7", name: "Samsung Galaxy S24", price: 899, stock: 28, category: "mobiles", image: samsung },
  { id: "8", name: "Dyson Vacuum", price: 599, stock: 15, category: "electronics", image: vacuum },
  { id: "9", name: "Gold Diamond Bracelet", price: 1299, stock: 8, category: "accessories", image: bracelet },
  { id: "10", name: "Chanel Perfume", price: 189, stock: 45, category: "accessories", image: perfume },
  { id: "11", name: "Logitech MX Master", price: 99, stock: 50, category: "electronics", image: mouse },
  { id: "12", name: "USB-C Cable", price: 29, stock: 100, category: "electronics", image: cable },
];

export const categories = [
  { id: "all", name: "All Categories", icon: "grid" },
  { id: "headphones", name: "Headphones", icon: "headphones" },
  { id: "shoes", name: "Shoes", icon: "shoe" },
  { id: "mobiles", name: "Mobiles", icon: "smartphone" },
  { id: "watches", name: "Watches", icon: "watch" },
  { id: "laptops", name: "Laptops", icon: "laptop" },
  { id: "electronics", name: "Electronics", icon: "cpu" },
  { id: "accessories", name: "Accessories", icon: "gem" },
];
