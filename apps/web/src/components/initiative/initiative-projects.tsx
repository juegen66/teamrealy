import { Link } from "@tanstack/react-router";
import { Plus, Target, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import icons from "@/constants/project-icons";
import useSetInitiativeProjects from "@/hooks/mutations/initiative/use-set-initiative-projects";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { toast } from "@/lib/toast";
import type { InitiativeDetail } from "./types";

type InitiativeProjectsProps = {
  workspaceId: string;
  initiative: InitiativeDetail;
  canEdit: boolean;
};

export default function InitiativeProjects({
  workspaceId,
  initiative,
  canEdit,
}: InitiativeProjectsProps) {
  const { t } = useTranslation();
  const { data: allProjects = [] } = useGetProjects({ workspaceId }) as {
    data: Array<{ id: string; name: string }> | undefined;
  };
  const setProjects = useSetInitiativeProjects();
  const [open, setOpen] = useState(false);

  const linkedIds = initiative.projects.map((project) => project.id);

  const save = async (projectIds: string[]) => {
    try {
      await setProjects.mutateAsync({ id: initiative.id, projectIds });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspace:initiatives.detail.projectsSaveError"),
      );
    }
  };

  const picker = canEdit ? (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t("workspace:initiatives.detail.manageProjects")}
        >
          <Plus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-72 w-64 overflow-y-auto p-2" align="end">
        {allProjects.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            {t("workspace:initiatives.noProjectsAvailable")}
          </p>
        ) : (
          allProjects.map((project) => (
            <Label
              key={project.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal hover:bg-accent/50"
            >
              <Checkbox
                checked={linkedIds.includes(project.id)}
                onCheckedChange={(checked) =>
                  void save(
                    checked === true
                      ? [...linkedIds, project.id]
                      : linkedIds.filter((id) => id !== project.id),
                  )
                }
              />
              {project.name}
            </Label>
          ))
        )}
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          {t("workspace:initiatives.detail.projectsLabel")}
        </h2>
        {picker}
      </div>

      {initiative.projects.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia>
              <Target className="size-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>
              {t("workspace:initiatives.detail.projectsEmptyTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {t("workspace:initiatives.detail.projectsEmptyDescription")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {initiative.projects.map((project) => {
            const ProjectIcon =
              icons[project.icon as keyof typeof icons] || icons.Layout;
            const percentage =
              project.totalTasks === 0
                ? 0
                : Math.round(
                    (project.completedTasks / project.totalTasks) * 100,
                  );

            return (
              <li
                key={project.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <ProjectIcon className="size-4 shrink-0 text-muted-foreground" />
                <Link
                  to="/dashboard/workspace/$workspaceId/project/$projectId/board"
                  params={{ workspaceId, projectId: project.id }}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {project.name}
                </Link>
                <div className="flex w-40 items-center gap-2">
                  <Progress value={percentage} />
                  <span className="w-9 text-end text-xs text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={t(
                      "workspace:initiatives.detail.unlinkProject",
                      {
                        name: project.name,
                      },
                    )}
                    onClick={() =>
                      void save(linkedIds.filter((id) => id !== project.id))
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
