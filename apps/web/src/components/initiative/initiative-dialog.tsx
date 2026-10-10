import { format, isValid, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useCreateInitiative from "@/hooks/mutations/initiative/use-create-initiative";
import useSetInitiativeProjects from "@/hooks/mutations/initiative/use-set-initiative-projects";
import useUpdateInitiative from "@/hooks/mutations/initiative/use-update-initiative";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-get-active-workspace-users";
import { toast } from "@/lib/toast";

const STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

type Status = (typeof STATUSES)[number];

const NO_OWNER = "__none__";

export type InitiativeFormTarget = {
  id: string;
  name: string;
  description: string | null;
  status: Status;
  ownerId: string | null;
  targetDate: string | Date | null;
  projectIds: string[];
};

type InitiativeDialogProps = {
  workspaceId: string;
  target: InitiativeFormTarget | "new" | null;
  onClose: () => void;
};

function toDateInputValue(value: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

export default function InitiativeDialog({
  workspaceId,
  target,
  onClose,
}: InitiativeDialogProps) {
  const { t } = useTranslation();
  const editing = target !== null && target !== "new" ? target : null;

  const { data: projects = [] } = useGetProjects({ workspaceId }) as {
    data: Array<{ id: string; name: string }> | undefined;
  };
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const members = workspaceUsers?.members ?? [];

  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative();
  const setProjects = useSetInitiativeProjects();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("planned");
  const [ownerId, setOwnerId] = useState(NO_OWNER);
  const [targetDate, setTargetDate] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target === null) return;
    setError("");
    if (target === "new") {
      setName("");
      setDescription("");
      setStatus("planned");
      setOwnerId(NO_OWNER);
      setTargetDate("");
      setProjectIds([]);
      return;
    }
    setName(target.name);
    setDescription(target.description ?? "");
    setStatus(target.status);
    setOwnerId(target.ownerId ?? NO_OWNER);
    setTargetDate(toDateInputValue(target.targetDate));
    setProjectIds(target.projectIds);
  }, [target]);

  const isPending =
    createInitiative.isPending ||
    updateInitiative.isPending ||
    setProjects.isPending;

  const toggleProject = (projectId: string, checked: boolean) => {
    setProjectIds((current) =>
      checked
        ? [...current, projectId]
        : current.filter((id) => id !== projectId),
    );
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("workspace:initiatives.nameRequired"));
      return;
    }

    const common = {
      name: trimmed,
      status,
      ownerId: ownerId === NO_OWNER ? null : ownerId,
      targetDate: targetDate
        ? new Date(`${targetDate}T00:00:00`).toISOString()
        : null,
    };

    try {
      if (editing) {
        await updateInitiative.mutateAsync({
          id: editing.id,
          ...common,
          description: description.trim() || null,
        });
        await setProjects.mutateAsync({ id: editing.id, projectIds });
        toast.success(t("workspace:initiatives.updateSuccess"));
      } else {
        await createInitiative.mutateAsync({
          workspaceId,
          ...common,
          description: description.trim() || undefined,
          projectIds,
        });
        toast.success(t("workspace:initiatives.createSuccess"));
      }
      onClose();
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : t(
              editing
                ? "workspace:initiatives.updateError"
                : "workspace:initiatives.createError",
            ),
      );
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("workspace:initiatives.editInitiative")
              : t("workspace:initiatives.createInitiative")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="initiative-name">
              {t("workspace:initiatives.nameLabel")}
            </Label>
            <Input
              id="initiative-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder={t("workspace:initiatives.namePlaceholder")}
              aria-invalid={error ? true : undefined}
            />
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="initiative-description">
              {t("workspace:initiatives.descriptionLabel")}
            </Label>
            <Textarea
              id="initiative-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("workspace:initiatives.descriptionPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("workspace:initiatives.statusLabel")}</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as Status)}
            >
              <SelectTrigger>
                <SelectValue>
                  {t(`workspace:initiatives.status.${status}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`workspace:initiatives.status.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("workspace:initiatives.ownerLabel")}</Label>
            <Select
              value={ownerId}
              onValueChange={(value) => setOwnerId(value as string)}
            >
              <SelectTrigger>
                <SelectValue>
                  {ownerId === NO_OWNER
                    ? t("workspace:initiatives.noOwner")
                    : (members.find((member) => member.userId === ownerId)?.user
                        ?.name ?? ownerId)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OWNER}>
                  {t("workspace:initiatives.noOwner")}
                </SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.user?.name ?? member.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="initiative-target-date">
              {t("workspace:initiatives.targetDateLabel")}
            </Label>
            <Input
              id="initiative-target-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">
              {t("workspace:initiatives.projectsLabel")}
            </legend>
            <p className="text-xs text-muted-foreground">
              {t("workspace:initiatives.projectsHint")}
            </p>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("workspace:initiatives.noProjectsAvailable")}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {projects.map((project) => (
                  <Label
                    key={project.id}
                    className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                  >
                    <Checkbox
                      checked={projectIds.includes(project.id)}
                      onCheckedChange={(checked) =>
                        toggleProject(project.id, checked === true)
                      }
                    />
                    {project.name}
                  </Label>
                ))}
              </div>
            )}
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("common:actions.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {editing
              ? t("workspace:initiatives.saveInitiative")
              : t("workspace:initiatives.createInitiative")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
