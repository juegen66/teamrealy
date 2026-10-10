import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import icons from "@/constants/project-icons";
import { cn } from "@/lib/cn";

type InitiativeIconPickerProps = {
  icon: string | null;
  color: string | null;
  readOnly: boolean;
  onChange: (icon: string) => void;
};

export default function InitiativeIconPicker({
  icon,
  color,
  readOnly,
  onChange,
}: InitiativeIconPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const Icon =
    icons[icon as keyof typeof icons] || icons.Target || icons.Layout;
  const filtered = Object.entries(icons).filter(([name]) =>
    name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const glyph = (
    <span
      className="inline-flex size-10 items-center justify-center rounded-lg bg-muted"
      style={color ? { color } : undefined}
    >
      <Icon className="size-6" />
    </span>
  );

  if (readOnly) return glyph;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger
        asChild
        aria-label={t("workspace:initiatives.detail.pickIcon")}
      >
        <button type="button" className="rounded-lg hover:opacity-80">
          {glyph}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("workspace:initiatives.detail.searchIcons")}
            className="h-8 text-xs"
          />
          <div className="max-h-[280px] overflow-y-auto pr-1">
            <div className="grid grid-cols-6 gap-1.5">
              {filtered.map(([name, Option]) => (
                <Button
                  key={name}
                  type="button"
                  variant="ghost"
                  size="sm"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "h-10 items-center justify-center rounded-md p-0",
                    icon === name &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <Option className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
