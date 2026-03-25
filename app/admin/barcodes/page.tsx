import { BarcodeGenerator } from '@/components/admin/barcode-generator';

export default function AdminBarcodesPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Fabric Barcodes</h1>
      <p className="text-muted-foreground mb-6">
        Generate CODE128 barcodes that scan as SKUs. Optionally show each fabric&apos;s name on the label
        for reference. Download individual PNGs or a single US Letter PDF with multiple labels per page.
      </p>
      <BarcodeGenerator />
    </div>
  );
}

