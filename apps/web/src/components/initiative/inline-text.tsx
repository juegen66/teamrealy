import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type InlineTextProps = {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  readOnly: boolean;
  multiline?: boolean;
  className?: string;
  ariaLabel: string;
};

const base =
  "block w-full resize-none appearance-none border-0 bg-transparent p-0 text-foreground outline-none placeholder:text-foreground/40";

export default function InlineText({
  value,
  onCommit,
  placeholder,
  readOnly,
  multiline = false,
  className,
  ariaLabel,
}: InlineTextProps) {
  const [draft, setDraft] = useState(value);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft changes the textarea content, so the height must be re-measured
  useEffect(() => {
    const element = areaRef.current;
    if (!multiline || !element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft, multiline]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  if (multiline) {
    return (
      <textarea
        ref={areaRef}
        rows={1}
        aria-label={ariaLabel}
        value={draft}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        className={cn(base, className)}
      />
    );
  }

  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={draft}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      className={cn(base, className)}
    />
  );
}
