"use client";

import { useEffect, useState, use } from "react";
import { EmissionForm } from "@/components/emissions/emission-form";
import { Spinner } from "@/components/ui/spinner";
import type { EmissionEntry } from "@/types";

export default function EditEmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [entry, setEntry] = useState<EmissionEntry | null>(null);

  useEffect(() => {
    fetch(`/api/emissions/${id}`)
      .then((r) => r.json())
      .then(setEntry)
      .catch(() => {});
  }, [id]);

  if (!entry) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <EmissionForm initialData={entry} />
    </div>
  );
}
