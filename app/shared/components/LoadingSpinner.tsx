import { Loader2 } from "lucide-react";
import { cn } from "~/shared/services";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  variant?: "default" | "primary" | "muted";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
};

const variantClasses = {
  default: "text-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function LoadingSpinner({ 
  size = "md", 
  className, 
  text,
  variant = "default" 
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn(
        "animate-spin",
        sizeClasses[size],
        variantClasses[variant]
      )} />
      {text && (
        <span className={cn("text-sm", variantClasses[variant])}>
          {text}
        </span>
      )}
    </div>
  );
}

export default LoadingSpinner;