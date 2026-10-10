import { count, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import db from "../../database";
import {
  initiativeLinkTable,
  initiativeProjectTable,
  initiativeTable,
  projectTable,
  taskTable,
} from "../../database/schema";

// Loads initiatives with their linked projects and task rollups using two
// aggregate queries, independent of how many tasks exist.
export async function loadInitiatives(where: SQL) {
  const initiatives = await db
    .select()
    .from(initiativeTable)
    .where(where)
    .orderBy(desc(initiativeTable.createdAt), desc(initiativeTable.id));

  if (initiatives.length === 0) {
    return [];
  }

  const initiativeIds = initiatives.map((initiative) => initiative.id);

  const links = await db
    .select({
      initiativeId: initiativeProjectTable.initiativeId,
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
      icon: projectTable.icon,
      archivedAt: projectTable.archivedAt,
      position: projectTable.position,
    })
    .from(initiativeProjectTable)
    .innerJoin(
      projectTable,
      eq(initiativeProjectTable.projectId, projectTable.id),
    )
    .where(inArray(initiativeProjectTable.initiativeId, initiativeIds))
    .orderBy(projectTable.position, projectTable.name);

  const resourceLinks = await db
    .select()
    .from(initiativeLinkTable)
    .where(inArray(initiativeLinkTable.initiativeId, initiativeIds))
    .orderBy(initiativeLinkTable.createdAt);

  const projectIds = [...new Set(links.map((link) => link.id))];
  const taskCounts = new Map<string, { total: number; completed: number }>();

  if (projectIds.length > 0) {
    const rows = await db
      .select({
        projectId: taskTable.projectId,
        total: count(),
        completed: count(
          sql`case when ${taskTable.status} in ('done', 'archived') then 1 end`,
        ),
      })
      .from(taskTable)
      .where(inArray(taskTable.projectId, projectIds))
      .groupBy(taskTable.projectId);

    for (const row of rows) {
      taskCounts.set(row.projectId, {
        total: Number(row.total),
        completed: Number(row.completed),
      });
    }
  }

  return initiatives.map((initiative) => {
    const projects = links
      .filter((link) => link.initiativeId === initiative.id)
      .map(({ initiativeId: _initiativeId, position: _position, ...rest }) => ({
        ...rest,
        totalTasks: taskCounts.get(rest.id)?.total ?? 0,
        completedTasks: taskCounts.get(rest.id)?.completed ?? 0,
      }));

    const totalTasks = projects.reduce((sum, p) => sum + p.totalTasks, 0);
    const completedTasks = projects.reduce(
      (sum, p) => sum + p.completedTasks,
      0,
    );

    return {
      ...initiative,
      projects,
      links: resourceLinks.filter(
        (link) => link.initiativeId === initiative.id,
      ),
      totalTasks,
      completedTasks,
      completionPercentage:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  });
}
