"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Supplier } from "@/types";

interface SupplierFormProps {
  initialData?: Supplier;
}

export function SupplierForm({ initialData }: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "supplier");
  const [country, setCountry] = useState(initialData?.country ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [contactName, setContactName] = useState(initialData?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = { name, type, country, city, address, contactName, contactEmail, notes };
    const url = isEdit ? `/api/suppliers/${initialData.id}` : "/api/suppliers";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) router.push("/suppliers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{isEdit ? "Edit Supplier" : "New Supplier"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input id="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Select id="type" label="Type" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: "supplier", label: "Supplier" }, { value: "buyer", label: "Buyer" }]} />
            <Input id="country" label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            <Input id="city" label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input id="address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="md:col-span-2" />
            <Input id="contactName" label="Contact Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Input id="contactEmail" label="Contact Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/suppliers")}>Cancel</Button>
      </div>
    </form>
  );
}
