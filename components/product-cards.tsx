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
    category}: ProductCardProps) {
        const formattedPrice = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency}).format(price);
    return (
        <Link href={'/products/$id'}>
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
                    )
                    )}
                </div>
            </Card>
        </Link>
    )}