import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import InitiativeDialog, {
  type InitiativeFormTarget,
} from "@/components/initiative/initiative-dialog";
import PageTitle from "@/components/page-title";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import icons from "@/constants/project-icons";
import useDeleteInitiative from "@/hooks/mutations/initiative/use-delete-initiative";
import useGetInitiatives from "@/hooks/queries/initiative/use-get-initiatives";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { formatDateMedium } from "@/lib/format";
import { toast } from "@/lib/toast";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/initiatives/",
)({
  component: RouteComponent,
});

const STATUS_BADGE_VARIANT = {
  planned: "outline",
  active: "info",
  paused: "warning",
  completed: "success",
  cancelled: "secondary",
} as const;

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const {
    canCreateProjects,
    canUpdateProjects,
    canDeleteProjects,
    isCheckingPermissions,
  } = useWorkspacePermission();
  const canCreate = canCreateProjects();
  const canUpdate = canUpdateProjects();
  const canDelete = canDeleteProjects();

  const { data: initiatives, isLoading } = useGetInitiatives(workspaceId);
  const deleteInitiative = useDeleteInitiative();

  const [dialogTarget, setDialogTarget] = useState<
    InitiativeFormTarget | "new" | null
  >(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
    null,
  );

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await deleteInitiative.mutateAsync({ id: deleting.id });
      toast.success(t("workspace:initiatives.deleteSuccess"));
      setDeleting(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspace:initiatives.deleteError"),
      );
    }
  };

  const headerActions = canCreate ? (
    <Button onClick={() => setDialogTarget("new")} className="gap-2" size="xs">
      <Plus className="size-4" />
      {t("workspace:initiatives.createInitiative")}
    </Button>
  ) : null;

  return (
    <>
      <PageTitle title={t("workspace:initiatives.pageTitle")} />
      <WorkspaceLayout
        title={t("workspace:initiatives.title")}
        headerActions={headerActions}
      >
        <div className="p-4">
          {isLoading || isCheckingPermissions ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !initiatives || initiatives.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <Target className="size-8 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>{t("workspace:initiatives.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {canCreate
                    ? t("workspace:initiatives.emptyDescription")
                    : t("workspace:initiatives.emptyDescriptionReadOnly")}
                </EmptyDescription>
              </EmptyHeader>
              {canCreate && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setDialogTarget("new")}>
                    <Plus className="size-4" />
                    {t("workspace:initiatives.createInitiative")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {initiatives.map((initiative) => {
                const status =
                  initiative.status in STATUS_BADGE_VARIANT
                    ? (initiative.status as keyof typeof STATUS_BADGE_VARIANT)
                    : "planned";
                const IconComponent =
                  icons[initiative.icon as keyof typeof icons] ||
                  icons.Target ||
                  icons.Layout;

                return (
                  <li
                    key={initiative.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <IconComponent className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-sm font-medium">
                              <Link
                                to="/dashboard/workspace/$workspaceId/initiatives/$initiativeId"
                                params={{
                                  workspaceId,
                                  initiativeId: initiative.id,
                                }}
                                className="hover:underline"
                              >
                                {initiative.name}
                              </Link>
                            </h2>
                            <Badge variant={STATUS_BADGE_VARIANT[status]}>
                              {t(`workspace:initiatives.status.${status}`)}
                            </Badge>
                          </div>
                          {(initiative.summary || initiative.description) && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {initiative.summary || initiative.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {initiative.targetDate
                              ? t("workspace:initiatives.targetBy", {
                                  date: formatDateMedium(initiative.targetDate),
                                })
                              : t("workspace:initiatives.noTargetDate")}
                          </p>
                        </div>
                      </div>
                      {(canUpdate || canDelete) && (
                        <div className="flex shrink-0 items-center gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={t(
                                "workspace:initiatives.editInitiative",
                              )}
                              onClick={() =>
                                setDialogTarget({
                                  id: initiative.id,
                                  name: initiative.name,
                                  description: initiative.description,
                                  status,
                                  ownerId: initiative.ownerId,
                                  targetDate: initiative.targetDate,
                                  projectIds: initiative.projects.map(
                                    (project) => project.id,
                                  ),
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label={t(
                                "workspace:initiatives.deleteInitiative",
                              )}
                              onClick={() =>
                                setDeleting({
                                  id: initiative.id,
                                  name: initiative.name,
                                })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5">
                      <Progress value={initiative.completionPercentage} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {t("workspace:initiatives.progress", {
                            percentage: initiative.completionPercentage,
                          })}
                        </span>
                        <span>
                          {t("workspace:initiatives.taskSummary", {
                            completed: initiative.completedTasks,
                            total: initiative.totalTasks,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {initiative.projects.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {t("workspace:initiatives.noProjects")}
                        </span>
                      ) : (
                        initiative.projects.map((project) => {
                          const ProjectIcon =
                            icons[project.icon as keyof typeof icons] ||
                            icons.Layout;
                          return (
                            <Link
                              key={project.id}
                              to="/dashboard/workspace/$workspaceId/project/$projectId/board"
                              params={{ workspaceId, projectId: project.id }}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent/50"
                            >
                              <ProjectIcon className="size-3" />
                              {project.name}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </WorkspaceLayout>

      <InitiativeDialog
        workspaceId={workspaceId}
        target={dialogTarget}
        onClose={() => setDialogTarget(null)}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("workspace:initiatives.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("workspace:initiatives.deleteConfirmDescription", {
                name: deleting?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common:actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInitiative.isPending}
            >
              {t("workspace:initiatives.deleteInitiative")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
