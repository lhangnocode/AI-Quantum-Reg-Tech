import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Khung card chung của Dashboard (bo 16px, padding 20px theo Figma). */
export function DashboardCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("gap-4 rounded-2xl shadow-sm ring-border [--card-spacing:--spacing(5)]", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}
