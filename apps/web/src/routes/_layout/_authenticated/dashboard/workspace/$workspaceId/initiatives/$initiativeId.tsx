import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import InitiativeIconPicker from "@/components/initiative/initiative-icon-picker";
import InitiativeProjects from "@/components/initiative/initiative-projects";
import InitiativeProperties, {
  type InitiativePatch,
} from "@/components/initiative/initiative-properties";
import InitiativeResources from "@/components/initiative/initiative-resources";
import InitiativeUpdates from "@/components/initiative/initiative-updates";
import InlineText from "@/components/initiative/inline-text";
import PageTitle from "@/components/page-title";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import useDeleteInitiative from "@/hooks/mutations/initiative/use-delete-initiative";
import useUpdateInitiative from "@/hooks/mutations/initiative/use-update-initiative";
import useGetInitiative from "@/hooks/queries/initiative/use-get-initiative";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/initiatives/$initiativeId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId, initiativeId } = Route.useParams();
  const { canUpdateProjects, canDeleteProjects, isCheckingPermissions } =
    useWorkspacePermission();
  const canEdit = canUpdateProjects();
  const canDelete = canDeleteProjects();

  const {
    data: initiative,
    isLoading,
    isError,
  } = useGetInitiative(initiativeId);
  const updateInitiative = useUpdateInitiative();
  const deleteInitiative = useDeleteInitiative();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const patch = async (changes: InitiativePatch) => {
    try {
      await updateInitiative.mutateAsync({ id: initiativeId, ...changes });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspace:initiatives.detail.saveError"),
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInitiative.mutateAsync({ id: initiativeId });
      toast.success(t("workspace:initiatives.deleteSuccess"));
      void navigate({
        to: "/dashboard/workspace/$workspaceId/initiatives",
        params: { workspaceId },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspace:initiatives.deleteError"),
      );
    }
  };

  const title = initiative?.name ?? t("workspace:initiatives.title");

  return (
    <>
      <PageTitle title={title} />
      <WorkspaceLayout title={title}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
          {isLoading || isCheckingPermissions ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="size-10" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : isError || !initiative ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                {t("workspace:initiatives.detail.notFound")}
              </p>
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    to="/dashboard/workspace/$workspaceId/initiatives"
                    params={{ workspaceId }}
                  />
                }
              >
                {t("workspace:initiatives.detail.backToList")}
              </Button>
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-3">
                <InitiativeIconPicker
                  icon={initiative.icon}
                  color={initiative.color}
                  readOnly={!canEdit}
                  onChange={(icon) => void patch({ icon })}
                />
                <InlineText
                  ariaLabel={t("workspace:initiatives.nameLabel")}
                  value={initiative.name}
                  readOnly={!canEdit}
                  placeholder={t(
                    "workspace:initiatives.detail.titlePlaceholder",
                  )}
                  onCommit={(name) => {
                    if (name.trim()) void patch({ name });
                  }}
                  className="font-heading text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em]"
                />
                <InlineText
                  multiline
                  ariaLabel={t(
                    "workspace:initiatives.detail.summaryPlaceholder",
                  )}
                  value={initiative.summary ?? ""}
                  readOnly={!canEdit}
                  placeholder={t(
                    "workspace:initiatives.detail.summaryPlaceholder",
                  )}
                  onCommit={(summary) => void patch({ summary })}
                  className="text-base text-muted-foreground"
                />
              </header>

              <InitiativeProperties
                workspaceId={workspaceId}
                initiative={initiative}
                canEdit={canEdit}
                canDelete={canDelete}
                onPatch={(changes) => void patch(changes)}
                onDelete={() => setConfirmingDelete(true)}
              />

              <InitiativeResources initiative={initiative} canEdit={canEdit} />

              <InitiativeUpdates
                initiativeId={initiativeId}
                canEdit={canEdit}
              />

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-medium">
                  {t("workspace:initiatives.detail.descriptionLabel")}
                </h2>
                <InlineText
                  multiline
                  ariaLabel={t("workspace:initiatives.detail.descriptionLabel")}
                  value={initiative.description ?? ""}
                  readOnly={!canEdit}
                  placeholder={t(
                    "workspace:initiatives.detail.descriptionPlaceholder",
                  )}
                  onCommit={(description) => void patch({ description })}
                  className="min-h-24 text-sm"
                />
              </section>

              <InitiativeProjects
                workspaceId={workspaceId}
                initiative={initiative}
                canEdit={canEdit}
              />
            </>
          )}
        </div>
      </WorkspaceLayout>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("workspace:initiatives.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("workspace:initiatives.deleteConfirmDescription", {
                name: initiative?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
            >
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
