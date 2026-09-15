import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MousePointer,
  Square,
  Circle,
  SolidLineFreeIcons,
  ArrowRight02Icon,
  PencilLine,
  TextIcon,
  EraserIcon,
  HandIcon,
  DiamondIcon,
} from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectToolbarProps {
  action: string[];
  setAction: (action: string[]) => void;
}

type Tool = {
  value: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  disabled?: boolean;
};

const TOOLS: Tool[] = [
  { value: "pan", label: "Pan", icon: HandIcon },
  { value: "select", label: "Select", icon: MousePointer },
  { value: "square", label: "Rectangle", icon: Square },
  { value: "diamond", label: "Diamond", icon: DiamondIcon },
  { value: "circle", label: "Circle", icon: Circle },
  { value: "arrow", label: "Arrow", icon: ArrowRight02Icon },
  { value: "line", label: "Line", icon: SolidLineFreeIcons },
  { value: "pencil", label: "Pencil", icon: PencilLine },
  { value: "text", label: "Text", icon: TextIcon },
  { value: "eraser", label: "Eraser", icon: EraserIcon },
];

export function ProjectToolbar({ action, setAction }: ProjectToolbarProps) {
  return (
    <ToggleGroup
      value={action}
      onValueChange={(val) => {
        if (val && val.length > 0) setAction(val as string[]);
      }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-card p-1 rounded-lg border shadow-sm"
    >
      {TOOLS.map((tool) => (
        <Tooltip key={tool.value}>
          <TooltipTrigger render={<ToggleGroupItem value={tool.value} aria-label={tool.label} disabled={tool.disabled} />}>
            <HugeiconsIcon icon={tool.icon} />
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            <p className="text-xs font-medium">{tool.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}

