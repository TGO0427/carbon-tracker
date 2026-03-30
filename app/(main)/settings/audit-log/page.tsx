"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Upload, PlusCircle, Pencil, Trash2, FileStack } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  count: number | null;
  userName: string;
  createdAt: string;
}

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "import", label: "Import" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "bulk_delete", label: "Bulk Delete" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All Entities" },
  { value: "emission", label: "Emission" },
  { value: "shipment", label: "Shipment" },
  { value: "target", label: "Target" },
  { value: "action_plan", label: "Action Plan" },
];

const actionIcons: Record<string, React.ReactNode> = {
  import: <Upload className="h-4 w-4 text-blue-500" />,
  create: <PlusCircle className="h-4 w-4 text-emerald-500" />,
  update: <Pencil className="h-4 w-4 text-amber-500" />,
  delete: <Trash2 className="h-4 w-4 text-red-500" />,
  bulk_delete: <FileStack className="h-4 w-4 text-red-500" />,
};

const actionColors: Record<string, string> = {
  import: "bg-blue-50 text-blue-700",
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-amber-50 text-amber-700",
  delete: "bg-red-50 text-red-700",
  bulk_delete: "bg-red-50 text-red-700",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity", entityFilter);

    fetch(`/api/audit-log?${params}`)
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actionFilter, entityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all changes made to your data"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity History</CardTitle>
            <div className="flex items-center gap-3">
              <Select
                id="action-filter"
                options={ACTION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="All Actions"
              />
              <Select
                id="entity-filter"
                options={ENTITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                placeholder="All Entities"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No audit log entries found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Action</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Entity</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Details</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Count</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          actionColors[log.action] || "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {actionIcons[log.action]}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize text-gray-700">
                      {log.entity.replace("_", " ")}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-gray-600">
                      {log.details || "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {log.count != null ? log.count : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{log.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
