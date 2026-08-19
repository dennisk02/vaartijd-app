import { prisma } from "@/lib/prisma";
import { Card, Button } from "@/components/ui";
import { ShipForm } from "@/components/admin/ship-form";
import { toggleShipActive } from "@/lib/actions/admin";

export default async function AdminShipsPage() {
  const ships = await prisma.ship.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <ShipForm />
      </Card>
      <div className="flex flex-col gap-3">
        {ships.map((ship) => (
          <Card key={ship.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{ship.name}</p>
              {ship.code && <p className="text-sm text-slate-500">Code: {ship.code}</p>}
              {ship.capacity && <p className="text-xs text-slate-400">Capaciteit: {ship.capacity}</p>}
            </div>
            <form action={toggleShipActive.bind(null, ship.id, !ship.active)}>
              <Button type="submit" variant={ship.active ? "secondary" : "primary"} className="text-xs">
                {ship.active ? "Deactiveren" : "Activeren"}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
