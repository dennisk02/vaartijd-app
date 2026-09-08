"use client";

import { Select } from "@/components/ui";

export function ShipSelect({
  ships,
  value,
  onChange,
}: {
  ships: { id: string; name: string }[];
  value: string;
  onChange: (shipId: string) => void;
}) {
  return (
    <Select aria-label="Schip" value={value} onChange={(e) => onChange(e.target.value)} className="w-auto text-sm">
      <option value="">Alle schepen</option>
      {ships.map((ship) => (
        <option key={ship.id} value={ship.id}>
          {ship.name}
        </option>
      ))}
    </Select>
  );
}
