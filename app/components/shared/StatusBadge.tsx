import { Badge } from "~/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Loader2, XCircle } from "lucide-react";
import { cn } from "~/services/shared";

export type StatusType = 
  | "idle" 
  | "processing" 
  | "completed" 
  | "error" 
  | "success"
  | "warning"
  | "pending";

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const statusConfig = {
  idle: {
    variant: "secondary" as const,
    icon: Clock,
    defaultText: "Idle",
    className: "text-muted-foreground",
  },
  pending: {
    variant: "secondary" as const,
    icon: Clock,
    defaultText: "Pending",
    className: "text-orange-600",
  },
  processing: {
    variant: "default" as const,
    icon: Loader2,
    defaultText: "Processing",
    className: "text-blue-600",
    animate: true,
  },
  completed: {
    variant: "secondary" as const,
    icon: CheckCircle,
    defaultText: "Completed",
    className: "text-green-600",
  },
  success: {
    variant: "secondary" as const,
    icon: CheckCircle,
    defaultText: "Success",
    className: "text-green-600",
  },
  error: {
    variant: "destructive" as const,
    icon: XCircle,
    defaultText: "Error",
    className: "text-red-600",
  },
  warning: {
    variant: "secondary" as const,
    icon: AlertCircle,
    defaultText: "Warning",
    className: "text-orange-600",
  },
};

export function StatusBadge({ 
  status, 
  text, 
  className, 
  showIcon = true, 
  size = "md" 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayText = text || config.defaultText;
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-1",
        config.className,
        size === "sm" && "text-xs px-2 py-0.5",
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            config.animate && "animate-spin"
          )} 
        />
      )}
      {displayText}
    </Badge>
  );
}

export default StatusBadge;