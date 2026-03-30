"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  Trash2,
  ClipboardList,
  Calendar,
  TrendingDown,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { Site } from "@/types";
import Link from "next/link";

interface ActionPlan {
  id: string;
  title: string;
  description: string | null;
  status: string;
  expectedReduction: number;
  actualReduction: number | null;
  startDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
  siteId: string | null;
  site: Site | null;
  targetId: string | null;
  target: {
    id: string;
    year: number;
    scope: number | null;
    targetEmissions: number;
    baselineEmissions: number;
  } | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bgColor: string; textColor: string; icon: React.ElementType }
> = {
  in_progress: {
    label: "In Progress",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: PlayCircle,
  },
  planned: {
    label: "Planned",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bgColor: "bg-gray-100",
    textColor: "text-gray-500",
    icon: XCircle,
  },
};

const STATUS_ORDER = ["in_progress", "planned", "completed", "cancelled"];

export default function ActionPlansPage() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [targets, setTargets] = useState<
    { id: string; year: number; scope: number | null; targetEmissions: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedReduction, setExpectedReduction] = useState("");
  const [siteId, setSiteId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPlans = () => {
    setLoading(true);
    fetch("/api/action-plans")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
    fetch("/api/sites")
      .then((r) => r.json())
      .then(setSites)
      .catch(() => {});
    fetch("/api/targets")
      .then((r) => r.json())
      .then(setTargets)
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setExpectedReduction("");
    setSiteId("");
    setTargetId("");
    setStartDate("");
    setTargetDate("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/action-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          expectedReduction: parseFloat(expectedReduction),
          siteId: siteId || null,
          targetId: targetId || null,
          startDate: startDate || null,
          targetDate: targetDate || null,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchPlans();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/action-plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchPlans();
  };

  const handleMarkCompleted = async (id: string, actualReduction: string) => {
    const value = parseFloat(actualReduction);
    if (isNaN(value)) return;
    await fetch(`/api/action-plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        actualReduction: value,
      }),
    });
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this action plan?")) return;
    await fetch(`/api/action-plans/${id}`, { method: "DELETE" });
    fetchPlans();
  };

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    items: plans.filter((p) => p.status === status),
  })).filter((g) => g.items.length > 0);

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Plans"
        description="Plan and track emission reduction initiatives"
        action={
          <div className="flex items-center gap-2">
            <Link href="/targets">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" /> Targets
              </Button>
            </Link>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "New Action"}
            </Button>
          </div>
        }
      />

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Action Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <Input
                  id="title"
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Switch to renewable energy supplier"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe the initiative and approach..."
                />
              </div>
              <Input
                id="expectedReduction"
                label="Expected Reduction (tCO2e)"
                type="number"
                step="any"
                value={expectedReduction}
                onChange={(e) => setExpectedReduction(e.target.value)}
                placeholder="e.g., 150"
                required
              />
              <Select
                id="site"
                label="Site (optional)"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="All sites"
                options={sites.map((s) => ({ value: s.id, label: s.name }))}
              />
              <Select
                id="target"
                label="Linked Target (optional)"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="No linked target"
                options={targets.map((t) => ({
                  value: t.id,
                  label: `${t.year}${t.scope ? ` Scope ${t.scope}` : ""} — ${formatNumber(t.targetEmissions)} tCO2e`,
                }))}
              />
              <Input
                id="startDate"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                id="targetDate"
                label="Target Date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <div className="md:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create Action Plan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Action Plan Cards grouped by status */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="No action plans yet"
            description="Create your first action plan to start tracking reduction initiatives."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> New Action
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ status, config, items }) => {
            const Icon = config.icon;
            return (
              <div key={status}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${config.textColor}`} />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {config.label}
                  </h2>
                  <span className="text-sm text-gray-400">
                    ({items.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {items.map((plan) => (
                    <ActionPlanCard
                      key={plan.id}
                      plan={plan}
                      formatDate={formatDate}
                      onStatusChange={handleStatusChange}
                      onMarkCompleted={handleMarkCompleted}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionPlanCard({
  plan,
  formatDate,
  onStatusChange,
  onMarkCompleted,
  onDelete,
}: {
  plan: ActionPlan;
  formatDate: (d: string | null) => string | null;
  onStatusChange: (id: string, status: string) => void;
  onMarkCompleted: (id: string, actual: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showComplete, setShowComplete] = useState(false);
  const [actualValue, setActualValue] = useState(
    plan.actualReduction != null ? String(plan.actualReduction) : String(plan.expectedReduction)
  );

  const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.planned;
  const StatusIcon = config.icon;

  const nextStatuses = (() => {
    switch (plan.status) {
      case "planned":
        return [
          { value: "in_progress", label: "Start" },
          { value: "cancelled", label: "Cancel" },
        ];
      case "in_progress":
        return [{ value: "cancelled", label: "Cancel" }];
      case "completed":
        return [{ value: "in_progress", label: "Reopen" }];
      case "cancelled":
        return [{ value: "planned", label: "Replan" }];
      default:
        return [];
    }
  })();

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 truncate">
                {plan.title}
              </h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.textColor}`}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>
            </div>
            {plan.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {plan.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
              {plan.site && <span>{plan.site.name}</span>}
              {plan.target && (
                <span>
                  Target: {plan.target.year}
                  {plan.target.scope ? ` Scope ${plan.target.scope}` : ""}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onDelete(plan.id)}
            className="ml-2 text-gray-300 hover:text-red-500 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Reduction info */}
        <div className="mt-4 flex items-center gap-3">
          <TrendingDown className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-900">
              Expected: {formatNumber(plan.expectedReduction)} tCO2e
            </span>
            {plan.actualReduction != null && (
              <span
                className={`text-sm font-medium ${
                  plan.actualReduction >= plan.expectedReduction
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                Actual: {formatNumber(plan.actualReduction)} tCO2e
              </span>
            )}
          </div>
        </div>

        {/* Progress bar for actual vs expected */}
        {plan.actualReduction != null && plan.expectedReduction > 0 && (
          <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full transition-all ${
                  plan.actualReduction >= plan.expectedReduction
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{
                  width: `${Math.min((plan.actualReduction / plan.expectedReduction) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
          {plan.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Start: {formatDate(plan.startDate)}
            </span>
          )}
          {plan.targetDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due: {formatDate(plan.targetDate)}
            </span>
          )}
          {plan.completedDate && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Completed: {formatDate(plan.completedDate)}
            </span>
          )}
        </div>

        {plan.notes && (
          <p className="mt-2 text-xs text-gray-400">{plan.notes}</p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {nextStatuses.map((ns) => (
            <Button
              key={ns.value}
              variant={ns.value === "cancelled" ? "ghost" : "outline"}
              size="sm"
              onClick={() => onStatusChange(plan.id, ns.value)}
            >
              {ns.label}
            </Button>
          ))}
          {plan.status === "in_progress" && !showComplete && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowComplete(true)}
            >
              <CheckCircle2 className="h-3 w-3" /> Complete
            </Button>
          )}
          {showComplete && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="Actual tCO2e"
                className="h-8 w-32 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  onMarkCompleted(plan.id, actualValue);
                  setShowComplete(false);
                }}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComplete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
