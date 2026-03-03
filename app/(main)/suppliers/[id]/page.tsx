"use client";

import { useEffect, useState, use } from "react";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Spinner } from "@/components/ui/spinner";
import type { Supplier } from "@/types";

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then(setSupplier)
      .catch(() => {});
  }, [id]);

  if (!supplier) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <SupplierForm initialData={supplier} />
    </div>
  );
}
