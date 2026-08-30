import {
  Activity,
  Baby,
  Bookmark,
  Droplets,
  Flag,
  HeartPulse,
  House,
  Pill,
  Scale,
  Syringe,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { MenuTarget } from "./SideMenu";

const ICONS: Record<MenuTarget, LucideIcon> = {
  home: House,
  pedDose: Syringe,
  growth: TrendingUp,
  bp: HeartPulse,
  bmi: Scale,
  crCl: Droplets,
  regimen: Pill,
  icu: Activity,
  ob: Baby,
  saved: Bookmark,
  report: Flag,
};

export default function ToolIcon({
  id,
  className,
  strokeWidth = 2,
}: {
  id: MenuTarget;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = ICONS[id];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
