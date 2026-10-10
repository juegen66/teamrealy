import { createFileRoute } from "@tanstack/react-router";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
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
import {
  Card,
  CardDescription,
  CardFrame,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import useCreateAgent from "@/hooks/mutations/agent/use-create-agent";
import useDeleteAgent from "@/hooks/mutations/agent/use-delete-agent";
import useUpdateAgent from "@/hooks/mutations/agent/use-update-agent";
import useGetAgentsByWorkspace from "@/hooks/queries/agent/use-get-agents-by-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { getInitials } from "@/lib/get-initials";
import { toast } from "@/lib/toast";

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/agents",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const { canManageWorkspace } = useWorkspacePermission();
  const canManage = canManageWorkspace();

  const { data: agents = [] } = useGetAgentsByWorkspace(workspaceId);

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newSchedule, setNewSchedule] = useState("");
  const [newTimezone, setNewTimezone] = useState("");
  const [createError, setCreateError] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<{
    id: string;
    name: string;
    instructions: string;
    model: string | null;
    schedule: string | null;
    scheduleTimezone: string | null;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [editError, setEditError] = useState("");

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const resetCreate = () => {
    setNewName("");
    setNewInstructions("");
    setNewModel("");
    setNewSchedule("");
    setNewTimezone("");
    setCreateError("");
  };

  const openCreate = () => {
    resetCreate();
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    const trimmedInstructions = newInstructions.trim();
    if (!trimmed || !trimmedInstructions) {
      setCreateError(
        t("settings:workspaceAgents.fieldsRequired", {
          defaultValue: "Name and instructions are required",
        }),
      );
      return;
    }

    try {
      await createAgent.mutateAsync({
        workspaceId,
        name: trimmed,
        instructions: trimmedInstructions,
        ...(newModel.trim() ? { model: newModel.trim() } : {}),
        ...(newSchedule.trim()
          ? {
              schedule: newSchedule.trim(),
              scheduleTimezone: newTimezone.trim() || browserTimezone,
            }
          : {}),
      });
      toast.success(
        t("settings:workspaceAgents.createSuccess", {
          defaultValue: "Agent created",
        }),
      );
      setCreateOpen(false);
      resetCreate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:workspaceAgents.createError", {
              defaultValue: "Failed to create agent",
            }),
      );
    }
  };

  const openEdit = (agent: {
    id: string;
    name: string;
    instructions: string;
    model: string | null;
    schedule: string | null;
    scheduleTimezone: string | null;
  }) => {
    setEditingAgent(agent);
    setEditName(agent.name);
    setEditInstructions(agent.instructions);
    setEditModel(agent.model ?? "");
    setEditSchedule(agent.schedule ?? "");
    setEditTimezone(agent.scheduleTimezone ?? "");
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingAgent) return;

    const trimmed = editName.trim();
    const trimmedInstructions = editInstructions.trim();
    if (!trimmed || !trimmedInstructions) {
      setEditError(
        t("settings:workspaceAgents.fieldsRequired", {
          defaultValue: "Name and instructions are required",
        }),
      );
      return;
    }

    try {
      await updateAgent.mutateAsync({
        id: editingAgent.id,
        name: trimmed,
        instructions: trimmedInstructions,
        ...(editModel.trim() ? { model: editModel.trim() } : {}),
        // null clears; an entered schedule always carries a timezone.
        schedule: editSchedule.trim() || null,
        scheduleTimezone: editSchedule.trim()
          ? editTimezone.trim() || browserTimezone
          : null,
      });
      toast.success(
        t("settings:workspaceAgents.updateSuccess", {
          defaultValue: "Agent updated",
        }),
      );
      setEditOpen(false);
      setEditingAgent(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:workspaceAgents.updateError", {
              defaultValue: "Failed to update agent",
            }),
      );
    }
  };

  const openDelete = (agent: { id: string; name: string }) => {
    setDeletingAgent(agent);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;

    try {
      await deleteAgent.mutateAsync({ id: deletingAgent.id });
      toast.success(
        t("settings:workspaceAgents.deleteSuccess", {
          defaultValue: "Agent deleted",
        }),
      );
      setDeleteOpen(false);
      setDeletingAgent(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:workspaceAgents.deleteError", {
              defaultValue: "Failed to delete agent",
            }),
      );
    }
  };

  return (
    <>
      <PageTitle title={t("settings:workspaceAgents.pageTitle")} />
      <WorkspaceLayout
        title={t("settings:workspaceAgents.title", {
          defaultValue: "Agents",
        })}
        headerActions={
          canManage ? (
            <Button onClick={openCreate} className="gap-2" size="xs">
              <Plus className="size-4" />
              {t("settings:workspaceAgents.createAgent", {
                defaultValue: "Create Agent",
              })}
            </Button>
          ) : null
        }
      >
        <CardFrame>
          <Card className="!rounded-none !border-t-0">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Bot className="size-4" />
                {t("settings:workspaceAgents.title", {
                  defaultValue: "Agents",
                })}
              </CardTitle>
              <CardDescription>
                {t("settings:workspaceAgents.cardDescription", {
                  defaultValue:
                    "Agents run on the assigned task with your permissions. Their comments are attributed to you.",
                })}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="!rounded-none">
            <CardPanel className="p-4">
              {agents.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia>
                      <Bot className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t("settings:workspaceAgents.empty", {
                        defaultValue:
                          "No agents yet. Create your first agent to assign it to tasks.",
                      })}
                    </EmptyTitle>
                    <EmptyDescription />
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="divide-y divide-border">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between py-2.5 px-1 gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium border border-border/30">
                          {getInitials(agent.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm truncate font-medium">
                            {agent.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-md">
                            {agent.instructions.slice(0, 120)}
                            {agent.instructions.length > 120 ? "…" : ""}
                          </p>
                          {agent.model && (
                            <p className="text-[11px] text-muted-foreground/70">
                              {agent.model}
                            </p>
                          )}
                          {agent.schedule && (
                            <p className="text-[11px] text-muted-foreground/70">
                              {t("settings:workspaceAgents.scheduleSummary", {
                                schedule: agent.schedule,
                                timezone: agent.scheduleTimezone ?? "UTC",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t(
                              "settings:workspaceAgents.editAgent",
                              { defaultValue: "Edit Agent" },
                            )}
                            className="h-8 w-8"
                            onClick={() =>
                              openEdit({
                                id: agent.id,
                                name: agent.name,
                                instructions: agent.instructions,
                                model: agent.model,
                                schedule: agent.schedule,
                                scheduleTimezone: agent.scheduleTimezone,
                              })
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t(
                              "settings:workspaceAgents.deleteAgent",
                              { defaultValue: "Delete" },
                            )}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              openDelete({ id: agent.id, name: agent.name })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardPanel>
          </Card>
        </CardFrame>
      </WorkspaceLayout>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => !open && setCreateOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("settings:workspaceAgents.createAgent", {
                defaultValue: "Create Agent",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("settings:workspaceAgents.createDescription", {
                defaultValue:
                  "Agents work on tasks with your permissions. Their comments appear under your name.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-agent-name">
                {t("settings:workspaceAgents.nameLabel", {
                  defaultValue: "Agent name",
                })}
              </Label>
              <Input
                id="new-agent-name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setCreateError("");
                }}
                placeholder={t("settings:workspaceAgents.namePlaceholder", {
                  defaultValue: "Enter agent name",
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-agent-instructions">
                {t("settings:workspaceAgents.instructionsLabel", {
                  defaultValue: "Instructions",
                })}
              </Label>
              <Textarea
                id="new-agent-instructions"
                value={newInstructions}
                onChange={(e) => {
                  setNewInstructions(e.target.value);
                  setCreateError("");
                }}
                placeholder={t(
                  "settings:workspaceAgents.instructionsPlaceholder",
                  {
                    defaultValue:
                      "Describe what this agent should do, e.g. 'Triage new tasks and summarize them as comments.'",
                  },
                )}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-agent-model">
                {t("settings:workspaceAgents.modelLabel", {
                  defaultValue: "Model (optional)",
                })}
              </Label>
              <Input
                id="new-agent-model"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder={t("settings:workspaceAgents.modelPlaceholder", {
                  defaultValue: "e.g. gpt-4o-mini",
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-agent-schedule">
                {t("settings:workspaceAgents.scheduleLabel", {
                  defaultValue: "Schedule (optional)",
                })}
              </Label>
              <Input
                id="new-agent-schedule"
                value={newSchedule}
                onChange={(e) => {
                  setNewSchedule(e.target.value);
                  if (e.target.value.trim() && !newTimezone) {
                    setNewTimezone(browserTimezone);
                  }
                  setCreateError("");
                }}
                placeholder={t("settings:workspaceAgents.schedulePlaceholder", {
                  defaultValue: "e.g. 0 9 * * 1-5",
                })}
                aria-describedby="new-agent-schedule-hint"
              />
              <p
                id="new-agent-schedule-hint"
                className="text-xs text-muted-foreground"
              >
                {t("settings:workspaceAgents.scheduleHint", {
                  defaultValue:
                    "Cron expression with five fields. Leave empty to disable scheduled runs.",
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-agent-timezone">
                {t("settings:workspaceAgents.timezoneLabel", {
                  defaultValue: "Timezone",
                })}
              </Label>
              <Input
                id="new-agent-timezone"
                value={newTimezone}
                onChange={(e) => {
                  setNewTimezone(e.target.value);
                  setCreateError("");
                }}
                placeholder={browserTimezone}
                aria-describedby="new-agent-timezone-hint"
              />
              <p
                id="new-agent-timezone-hint"
                className="text-xs text-muted-foreground"
              >
                {t("settings:workspaceAgents.timezoneHint", {
                  defaultValue:
                    "IANA timezone name used to evaluate the schedule.",
                })}
              </p>
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleCreate} disabled={createAgent.isPending}>
              {t("settings:workspaceAgents.createAgent", {
                defaultValue: "Create Agent",
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            setEditingAgent(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("settings:workspaceAgents.editAgent", {
                defaultValue: "Edit Agent",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("settings:workspaceAgents.editDescription", {
                defaultValue:
                  "Update the agent's name, instructions, or model. Tasks keep their assignment.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-agent-name">
                {t("settings:workspaceAgents.nameLabel", {
                  defaultValue: "Agent name",
                })}
              </Label>
              <Input
                id="edit-agent-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditError("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-agent-instructions">
                {t("settings:workspaceAgents.instructionsLabel", {
                  defaultValue: "Instructions",
                })}
              </Label>
              <Textarea
                id="edit-agent-instructions"
                value={editInstructions}
                onChange={(e) => {
                  setEditInstructions(e.target.value);
                  setEditError("");
                }}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-agent-model">
                {t("settings:workspaceAgents.modelLabel", {
                  defaultValue: "Model (optional)",
                })}
              </Label>
              <Input
                id="edit-agent-model"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-agent-schedule">
                {t("settings:workspaceAgents.scheduleLabel", {
                  defaultValue: "Schedule (optional)",
                })}
              </Label>
              <Input
                id="edit-agent-schedule"
                value={editSchedule}
                onChange={(e) => {
                  setEditSchedule(e.target.value);
                  if (e.target.value.trim() && !editTimezone) {
                    setEditTimezone(browserTimezone);
                  }
                  setEditError("");
                }}
                placeholder={t("settings:workspaceAgents.schedulePlaceholder", {
                  defaultValue: "e.g. 0 9 * * 1-5",
                })}
                aria-describedby="edit-agent-schedule-hint"
              />
              <p
                id="edit-agent-schedule-hint"
                className="text-xs text-muted-foreground"
              >
                {t("settings:workspaceAgents.scheduleHint", {
                  defaultValue:
                    "Cron expression with five fields. Leave empty to disable scheduled runs.",
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-agent-timezone">
                {t("settings:workspaceAgents.timezoneLabel", {
                  defaultValue: "Timezone",
                })}
              </Label>
              <Input
                id="edit-agent-timezone"
                value={editTimezone}
                onChange={(e) => {
                  setEditTimezone(e.target.value);
                  setEditError("");
                }}
                placeholder={browserTimezone}
                aria-describedby="edit-agent-timezone-hint"
              />
              <p
                id="edit-agent-timezone-hint"
                className="text-xs text-muted-foreground"
              >
                {t("settings:workspaceAgents.timezoneHint", {
                  defaultValue:
                    "IANA timezone name used to evaluate the schedule.",
                })}
              </p>
            </div>

            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingAgent(null);
              }}
            >
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={handleEdit} disabled={updateAgent.isPending}>
              {t("settings:workspaceAgents.saveAgent", {
                defaultValue: "Save",
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOpen(false);
            setDeletingAgent(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:workspaceAgents.deleteConfirmTitle", {
                defaultValue: "Delete this agent?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:workspaceAgents.deleteConfirmDescription", {
                defaultValue:
                  "Tasks using this agent will be unassigned and its active runs cancelled. Past runs and comments keep the agent's name.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingAgent(null);
              }}
            >
              {t("common:actions.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAgent.isPending}
            >
              {t("settings:workspaceAgents.deleteAgent", {
                defaultValue: "Delete",
              })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
