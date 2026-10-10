import { ExternalLink, Link2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useAddInitiativeLink from "@/hooks/mutations/initiative/use-add-initiative-link";
import useDeleteInitiativeLink from "@/hooks/mutations/initiative/use-delete-initiative-link";
import { toast } from "@/lib/toast";
import type { InitiativeDetail } from "./types";

type InitiativeResourcesProps = {
  initiative: InitiativeDetail;
  canEdit: boolean;
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function InitiativeResources({
  initiative,
  canEdit,
}: InitiativeResourcesProps) {
  const { t } = useTranslation();
  const addLink = useAddInitiativeLink();
  const deleteLink = useDeleteInitiativeLink();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setUrl("");
    setTitle("");
    setError("");
  };

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!isHttpUrl(trimmed)) {
      setError(t("workspace:initiatives.detail.resourceInvalidUrl"));
      return;
    }

    try {
      await addLink.mutateAsync({
        id: initiative.id,
        url: trimmed,
        title: title.trim() || undefined,
      });
      setOpen(false);
      reset();
    } catch (addError) {
      toast.error(
        addError instanceof Error
          ? addError.message
          : t("workspace:initiatives.detail.resourceAddError"),
      );
    }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await deleteLink.mutateAsync({ id: initiative.id, linkId });
    } catch (removeError) {
      toast.error(
        removeError instanceof Error
          ? removeError.message
          : t("workspace:initiatives.detail.resourceRemoveError"),
      );
    }
  };

  if (!canEdit && initiative.links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {t("workspace:initiatives.detail.resourcesLabel")}
      </span>
      {initiative.links.map((link) => (
        <span
          key={link.id}
          className="group inline-flex h-7 items-center gap-1.5 rounded-md border border-border ps-2 pe-1 text-xs"
        >
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <Link2 className="size-3.5 text-muted-foreground" />
            {link.title}
            <ExternalLink className="size-3 text-muted-foreground" />
          </a>
          {canEdit && (
            <button
              type="button"
              aria-label={t("workspace:initiatives.detail.removeResource", {
                title: link.title,
              })}
              onClick={() => handleRemove(link.id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      {canEdit && (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) reset();
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={t("workspace:initiatives.detail.addResource")}
            >
              <Plus className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleAdd();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="initiative-resource-url">
                  {t("workspace:initiatives.detail.resourceUrlLabel")}
                </Label>
                <Input
                  id="initiative-resource-url"
                  value={url}
                  autoFocus
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError("");
                  }}
                  placeholder={t(
                    "workspace:initiatives.detail.resourceUrlPlaceholder",
                  )}
                  aria-invalid={error ? true : undefined}
                />
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="initiative-resource-title">
                  {t("workspace:initiatives.detail.resourceTitleLabel")}
                </Label>
                <Input
                  id="initiative-resource-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t(
                    "workspace:initiatives.detail.resourceTitlePlaceholder",
                  )}
                />
              </div>
              <Button type="submit" size="sm" disabled={addLink.isPending}>
                {t("workspace:initiatives.detail.addResource")}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
