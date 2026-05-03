export interface Product {
  id: string | number;
  name: string;
  description: string;
  price: number;
  category: string;
  seller_id?: string;
  seller_name?: string;
  status?: string;
  image_url?: string | null;
  condition?: string;
  created_at?: string;
  imageEmoji?: string | null;
  imageBg?: string;
  soldPcs?: number;
  availPcs?: number;
  sizes: string[];
  genders: string[];
  colors: { label: string; hex: string }[];
}


export const categories = [
  { id: "all", label: "All Items", icon: "LayoutGrid" },
  { id: "Clothes", label: "Clothes", icon: "Shirt" },
  { id: "Accessories", label: "Accessories", icon: "Glasses" },
  { id: "Books", label: "Books", icon: "Book" },
  { id: "Electronics", label: "Electronics", icon: "Zap" },
  { id: "Home Goods", label: "Home Goods", icon: "Home" },
];
