import { BarcodeGenerator } from '@/components/admin/barcode-generator';

export default function AdminBarcodesPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Fabric Barcodes</h1>
      <p className="text-muted-foreground mb-6">
        Generate and download CODE128 barcodes for SKUs.
      </p>
      <BarcodeGenerator />
    </div>
  );
}

