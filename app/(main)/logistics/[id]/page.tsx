"use client";

import { useEffect, useState, use } from "react";
import { ShipmentForm } from "@/components/logistics/shipment-form";
import { Spinner } from "@/components/ui/spinner";
import type { Shipment } from "@/types";

export default function EditShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    fetch(`/api/logistics/${id}`)
      .then((r) => r.json())
      .then(setShipment)
      .catch(() => {});
  }, [id]);

  if (!shipment) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ShipmentForm initialData={shipment} />
    </div>
  );
}
