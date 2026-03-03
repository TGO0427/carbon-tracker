import { cn } from "@/lib/utils";
import { SCOPES } from "@/lib/constants";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "scope1" | "scope2" | "scope3" | "inbound" | "outbound";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700",
    scope1: `${SCOPES[1].bgColor} ${SCOPES[1].color}`,
    scope2: `${SCOPES[2].bgColor} ${SCOPES[2].color}`,
    scope3: `${SCOPES[3].bgColor} ${SCOPES[3].color}`,
    inbound: "bg-purple-100 text-purple-700",
    outbound: "bg-teal-100 text-teal-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: number }) {
  const variant = `scope${scope}` as "scope1" | "scope2" | "scope3";
  return <Badge variant={variant}>Scope {scope}</Badge>;
}
