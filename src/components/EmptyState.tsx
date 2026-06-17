import { ReactNode } from "react";

export function EmptyState({
  icon, title, description, action,
}: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="panel-inset flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-muted-foreground opacity-70">{icon}</div>}
      <div className="font-heading text-lg">{title}</div>
      {description && <div className="text-sm text-muted-foreground max-w-md">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
