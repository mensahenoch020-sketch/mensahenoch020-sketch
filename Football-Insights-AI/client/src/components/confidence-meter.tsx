import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface ConfidenceMeterProps {
  level: "Low" | "Mid" | "High";
}

export function ConfidenceMeter({ level }: ConfidenceMeterProps) {
  const config = {
    Low: {
      color: "text-destructive",
      bgColor: "bg-destructive/10 border-destructive/20",
      icon: AlertTriangle,
    },
    Mid: {
      color: "text-[#FFB800]",
      bgColor: "bg-[#FFB800]/10 border-[#FFB800]/20",
      icon: Shield,
    },
    High: {
      color: "text-[#00FFA3]",
      bgColor: "bg-[#00FFA3]/10 border-[#00FFA3]/20",
      icon: CheckCircle,
    },
  };

  const { color, bgColor, icon: Icon } = config[level];

  return (
    <Badge variant="outline" className={`gap-1 text-[10px] ${bgColor} ${color}`} data-testid={`badge-confidence-${level.toLowerCase()}`}>
      <Icon className="w-3 h-3" />
      {level} Confidence
    </Badge>
  );
}
