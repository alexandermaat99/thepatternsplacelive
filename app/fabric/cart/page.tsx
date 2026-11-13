import { redirect } from 'next/navigation';

// Fabric now shares the main cart.
export default function FabricCartPage() {
  redirect('/cart');
}
