import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useCreateInitiativeUpdate from "@/hooks/mutations/initiative/use-create-initiative-update";
import useGetInitiativeUpdates from "@/hooks/queries/initiative/use-get-initiative-updates";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import { toast } from "@/lib/toast";
import { HEALTH_DOT_CLASS, INITIATIVE_HEALTHS } from "./types";

type Health = (typeof INITIATIVE_HEALTHS)[number];

type InitiativeUpdatesProps = {
  initiativeId: string;
  canEdit: boolean;
};

export default function InitiativeUpdates({
  initiativeId,
  canEdit,
}: InitiativeUpdatesProps) {
  const { t } = useTranslation();
  const { data: updates = [] } = useGetInitiativeUpdates(initiativeId);
  const createUpdate = useCreateInitiativeUpdate();
  const [composing, setComposing] = useState(false);
  const [health, setHealth] = useState<Health>("on-track");
  const [body, setBody] = useState("");

  const handlePost = async () => {
    if (!body.trim()) return;

    try {
      await createUpdate.mutateAsync({ id: initiativeId, health, body });
      setBody("");
      setHealth("on-track");
      setComposing(false);
    } catch (postError) {
      toast.error(
        postError instanceof Error
          ? postError.message
          : t("workspace:initiatives.detail.updatePostError"),
      );
    }
  };

  const showComposer = canEdit && (composing || updates.length > 0);

  return (
    <section className="flex flex-col gap-3">
      {canEdit && !composing && (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="w-full rounded-lg border border-border px-4 py-3 text-start text-sm text-muted-foreground hover:bg-accent/40"
        >
          {updates.length === 0
            ? t("workspace:initiatives.detail.writeFirstUpdate")
            : t("workspace:initiatives.detail.writeUpdate")}
        </button>
      )}

      {showComposer && composing && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {INITIATIVE_HEALTHS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={health === option}
                onClick={() => setHealth(option)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
                  health === option
                    ? "border-foreground/40 bg-accent"
                    : "border-border hover:bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    HEALTH_DOT_CLASS[option],
                  )}
                />
                {t(`workspace:initiatives.detail.health.${option}`)}
              </button>
            ))}
          </div>
          <Textarea
            autoFocus
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("workspace:initiatives.detail.updatePlaceholder")}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setComposing(false);
                setBody("");
              }}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handlePost}
              disabled={createUpdate.isPending || !body.trim()}
            >
              {t("workspace:initiatives.detail.postUpdate")}
            </Button>
          </div>
        </div>
      )}

      {updates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {updates.map((update) => (
            <li
              key={update.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="size-5">
                  <AvatarImage
                    src={update.author?.image ?? ""}
                    alt={update.author?.name ?? ""}
                  />
                  <AvatarFallback className="text-[9px]">
                    {getInitials(update.author?.name)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {t("workspace:initiatives.detail.updateBy", {
                    name:
                      update.author?.name ||
                      t("workspace:initiatives.detail.unknownAuthor"),
                    time: formatRelativeTime(update.createdAt),
                  })}
                </span>
                <span className="ms-auto inline-flex items-center gap-1.5 text-foreground">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      HEALTH_DOT_CLASS[update.health],
                    )}
                  />
                  {t(`workspace:initiatives.detail.health.${update.health}`, {
                    defaultValue: update.health,
                  })}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{update.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
