import {
  Activity,
  Baby,
  Bookmark,
  Droplet,
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
  insulin: Droplet,
  ob: Baby,
  saved: Bookmark,
  report: Flag,
};

/** One dark colour per tool — chip backgrounds, menu icon tints, watermark. */
export const TOOL_BG: Record<MenuTarget, string> = {
  home: "bg-slate-900",
  pedDose: "bg-blue-900",
  growth: "bg-violet-900",
  bp: "bg-cyan-900",
  bmi: "bg-emerald-900",
  crCl: "bg-teal-900",
  regimen: "bg-rose-900",
  icu: "bg-orange-900",
  insulin: "bg-indigo-900",
  ob: "bg-fuchsia-900",
  saved: "bg-slate-800",
  report: "bg-amber-900",
};

/** Faded tint of each tool's colour — home card backgrounds. */
export const TOOL_SOFT: Record<MenuTarget, string> = {
  home: "border-slate-200 bg-slate-50",
  pedDose: "border-blue-200 bg-blue-50",
  growth: "border-violet-200 bg-violet-50",
  bp: "border-cyan-200 bg-cyan-50",
  bmi: "border-emerald-200 bg-emerald-50",
  crCl: "border-teal-200 bg-teal-50",
  regimen: "border-rose-200 bg-rose-50",
  icu: "border-orange-200 bg-orange-50",
  insulin: "border-indigo-200 bg-indigo-50",
  ob: "border-fuchsia-200 bg-fuchsia-50",
  saved: "border-slate-200 bg-slate-50",
  report: "border-amber-200 bg-amber-50",
};

export const TOOL_TEXT: Record<MenuTarget, string> = {
  home: "text-slate-800",
  pedDose: "text-blue-900",
  growth: "text-violet-900",
  bp: "text-cyan-900",
  bmi: "text-emerald-900",
  crCl: "text-teal-900",
  regimen: "text-rose-900",
  icu: "text-orange-900",
  insulin: "text-indigo-900",
  ob: "text-fuchsia-900",
  saved: "text-slate-700",
  report: "text-amber-900",
};

export const TOOL_HEX: Record<MenuTarget, string> = {
  home: "#0f172a",
  pedDose: "#1e3a8a",
  growth: "#4c1d95",
  bp: "#164e63",
  bmi: "#064e3b",
  crCl: "#134e4a",
  regimen: "#881337",
  icu: "#7c2d12",
  insulin: "#312e81",
  ob: "#701a75",
  saved: "#1e293b",
  report: "#78350f",
};

export default function ToolIcon({
  id,
  className,
  strokeWidth = 2,
  style,
}: {
  id: MenuTarget;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const Icon = ICONS[id];
  return <Icon className={className} strokeWidth={strokeWidth} style={style} aria-hidden />;
}
