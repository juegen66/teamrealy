import { format } from "date-fns";
import { Check, Ellipsis, Trash2, User, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UpdateInitiativeRequest } from "@/fetchers/initiative/update-initiative";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-get-active-workspace-users";
import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/get-initials";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import {
  INITIATIVE_PRIORITIES,
  INITIATIVE_STATUSES,
  type InitiativeDetail,
} from "./types";

export type InitiativePatch = Omit<UpdateInitiativeRequest, "id">;

type InitiativePropertiesProps = {
  workspaceId: string;
  initiative: InitiativeDetail;
  canEdit: boolean;
  canDelete: boolean;
  onPatch: (patch: InitiativePatch) => void;
  onDelete: () => void;
};

const chip =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium hover:bg-accent/50 disabled:cursor-default disabled:hover:bg-transparent";

type PickerProps = {
  trigger: ReactNode;
  canEdit: boolean;
  children: (close: () => void) => ReactNode;
  className?: string;
};

function Picker({ trigger, canEdit, children, className }: PickerProps) {
  const [open, setOpen] = useState(false);

  if (!canEdit) return <>{trigger}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn("p-0", className)} align="start">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-full justify-start gap-2 rounded-none px-2"
      onClick={onClick}
    >
      {children}
      {selected && <Check className="ml-auto size-4" />}
    </Button>
  );
}

export default function InitiativeProperties({
  workspaceId,
  initiative,
  canEdit,
  canDelete,
  onPatch,
  onDelete,
}: InitiativePropertiesProps) {
  const { t } = useTranslation();
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const members = workspaceUsers?.members ?? [];
  const owner = members.find((member) => member.userId === initiative.ownerId);
  const targetDate = initiative.targetDate
    ? new Date(initiative.targetDate)
    : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Picker
        canEdit={canEdit}
        className="w-44"
        trigger={
          <button type="button" className={chip} disabled={!canEdit}>
            {t(`workspace:initiatives.status.${initiative.status}`)}
          </button>
        }
      >
        {(close) =>
          INITIATIVE_STATUSES.map((status) => (
            <OptionRow
              key={status}
              selected={initiative.status === status}
              onClick={() => {
                onPatch({ status });
                close();
              }}
            >
              {t(`workspace:initiatives.status.${status}`)}
            </OptionRow>
          ))
        }
      </Picker>

      <Picker
        canEdit={canEdit}
        className="w-48"
        trigger={
          <button type="button" className={chip} disabled={!canEdit}>
            {getPriorityIcon(initiative.priority)}
            {getPriorityLabel(initiative.priority)}
          </button>
        }
      >
        {(close) =>
          INITIATIVE_PRIORITIES.map((priority) => (
            <OptionRow
              key={priority}
              selected={initiative.priority === priority}
              onClick={() => {
                onPatch({ priority });
                close();
              }}
            >
              {getPriorityIcon(priority)}
              {getPriorityLabel(priority)}
            </OptionRow>
          ))
        }
      </Picker>

      <Picker
        canEdit={canEdit}
        className="max-h-72 w-56 overflow-y-auto"
        trigger={
          <button type="button" className={chip} disabled={!canEdit}>
            {owner ? (
              <>
                <Avatar className="size-4">
                  <AvatarImage
                    src={owner.user?.image ?? ""}
                    alt={owner.user?.name ?? ""}
                  />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(owner.user?.name)}
                  </AvatarFallback>
                </Avatar>
                {owner.user?.name}
              </>
            ) : (
              <>
                <User className="size-3.5 text-muted-foreground" />
                {t("workspace:initiatives.noOwner")}
              </>
            )}
          </button>
        }
      >
        {(close) => (
          <>
            <OptionRow
              selected={!initiative.ownerId}
              onClick={() => {
                onPatch({ ownerId: null });
                close();
              }}
            >
              <User className="size-4 text-muted-foreground" />
              {t("workspace:initiatives.noOwner")}
            </OptionRow>
            {members.map((member) => (
              <OptionRow
                key={member.userId}
                selected={initiative.ownerId === member.userId}
                onClick={() => {
                  onPatch({ ownerId: member.userId });
                  close();
                }}
              >
                <Avatar className="size-5">
                  <AvatarImage
                    src={member.user?.image ?? ""}
                    alt={member.user?.name ?? ""}
                  />
                  <AvatarFallback className="text-[9px]">
                    {getInitials(member.user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.user?.name}</span>
              </OptionRow>
            ))}
          </>
        )}
      </Picker>

      <Picker
        canEdit={canEdit}
        trigger={
          <button type="button" className={chip} disabled={!canEdit}>
            {targetDate
              ? format(targetDate, "MMM d, yyyy")
              : t("workspace:initiatives.detail.noTargetDate")}
          </button>
        }
      >
        {(close) => (
          <>
            <Calendar
              mode="single"
              selected={targetDate}
              onSelect={(date) => {
                onPatch({ targetDate: date ? date.toISOString() : null });
                close();
              }}
              className="w-full bg-popover"
            />
            {targetDate && (
              <div className="border-t border-border pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onPatch({ targetDate: null });
                    close();
                  }}
                >
                  <X className="size-4" />
                  {t("workspace:initiatives.detail.clearTargetDate")}
                </Button>
              </div>
            )}
          </>
        )}
      </Picker>

      {canDelete && (
        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t("workspace:initiatives.detail.moreActions")}
              />
            }
          >
            <Ellipsis className="size-4" />
          </MenuTrigger>
          <MenuPopup align="start">
            <MenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              {t("workspace:initiatives.deleteInitiative")}
            </MenuItem>
          </MenuPopup>
        </Menu>
      )}
    </div>
  );
}
