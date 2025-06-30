import { Progress } from "~/shared/components/progress";
import { cn } from "~/shared/services";

interface ProgressIndicatorProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2", 
  lg: "h-3",
};

const variantClasses = {
  default: "",
  success: "[&>div]:bg-green-500",
  warning: "[&>div]:bg-orange-500", 
  error: "[&>div]:bg-red-500",
};

export function ProgressIndicator({
  value,
  label,
  showPercentage = true,
  size = "md",
  variant = "default",
  className,
  animated = false,
}: ProgressIndicatorProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  
  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && (
            <span className="text-muted-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className="text-muted-foreground font-medium">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      
      <Progress 
        value={clampedValue}
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          animated && "transition-all duration-500 ease-out"
        )}
      />
    </div>
  );
}

export function MultiStepProgress({
  steps,
  currentStep,
  className,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  const progress = (currentStep / (steps.length - 1)) * 100;
  
  return (
    <div className={cn("space-y-3", className)}>
      <ProgressIndicator 
        value={progress}
        showPercentage={false}
        animated
      />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={cn(
              "flex flex-col items-center space-y-1",
              index === currentStep && "text-primary font-medium",
              index < currentStep && "text-green-600"
            )}
          >
            <div 
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                index === currentStep && "border-primary bg-primary text-primary-foreground",
                index < currentStep && "border-green-600 bg-green-600 text-white",
                index > currentStep && "border-muted-foreground/30"
              )}
            >
              {index < currentStep ? "✓" : index + 1}
            </div>
            <span className="max-w-[80px] text-center leading-tight">
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgressIndicator;