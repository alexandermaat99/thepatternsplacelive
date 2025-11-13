import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  category?: string | null;
}

export function ProductCard({
  id,
  title,
  price,
  currency = "USD",
  imageUrl,
  category,
}: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(price);

  return (
    <Link href={`/products/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-square relative bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
          {category && (
            <p className="text-sm text-gray-500 mb-2">{category}</p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="text-xl font-bold">{formattedPrice}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}