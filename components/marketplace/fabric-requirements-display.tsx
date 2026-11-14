import { Scissors } from 'lucide-react';
import { FABRIC_TYPE_LABELS, formatYardage, type FabricRequirements } from '@/lib/fabric-requirements';

/** "Fabric needed" box on the product page (and the listing preview). */
export function FabricRequirementsDisplay({ requirements }: { requirements: FabricRequirements }) {
  const { fabricType, suggested, widthInches, sizes } = requirements;
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <Scissors className="h-4 w-4" /> Fabric needed
      </h3>
      <p className="text-sm text-muted-foreground">
        {FABRIC_TYPE_LABELS[fabricType]}
        {suggested ? `: ${suggested}` : ''}. Yardage for {widthInches === 60 ? '58–60"' : '44–45"'} wide fabric.
      </p>
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {sizes.map((s, i) => (
            <tr key={i}>
              <td className="py-1.5 pr-4">{s.label}</td>
              <td className="py-1.5 text-right font-medium tabular-nums">{formatYardage(s.yards)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
