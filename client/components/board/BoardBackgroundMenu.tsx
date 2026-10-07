"use client";

import { Check, LayoutGrid } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BoardBackground } from "@/hooks/useBoardBackground";

type Props = {
  value: BoardBackground;
  onChange: (value: BoardBackground) => void;
};

const OPTIONS: { id: BoardBackground; label: string }[] = [
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "plain", label: "Plain" },
];

const triggerBtn =
  "grid size-9 shrink-0 place-items-center rounded-xl text-[#9a9a9a] transition-colors hover:bg-[#262626] hover:text-[#ededed]";

const menuContent =
  "w-44 rounded-xl border border-[#262626] bg-[#121212] p-1.5 text-[#ededed] shadow-xl ring-1 ring-[#262626]";

const menuItem =
  "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#ededed] outline-none transition-colors hover:bg-[#262626] focus:bg-[#262626]";

const BoardBackgroundMenu = ({ value, onChange }: Props) => {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Background"
            title="Background"
            className={triggerBtn}
          >
            <LayoutGrid className="size-[18px]" />
          </button>
        }
      />
      <PopoverContent align="end" className={menuContent}>
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={menuItem}
          >
            {option.label}
            {value === option.id && <Check className="size-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default BoardBackgroundMenu;
