import type { ProjectImport } from "@/lib/validation/task";

export function summarizeProjectManifest(manifest: ProjectImport) {
  const parents = manifest.tasks.filter(
    (task) => task.parentExternalKey === null,
  );
  const subtasks = manifest.tasks.filter(
    (task) => task.parentExternalKey !== null,
  );
  return {
    projectCount: 1,
    parentCount: parents.length,
    subtaskCount: subtasks.length,
    totalTaskCount: manifest.tasks.length,
    estimatedMinutes: subtasks.reduce(
      (sum, task) => sum + (task.estimatedMinutes ?? 0),
      0,
    ),
    timezone: manifest.project.timezone,
    startDate: manifest.project.startDate,
    endDate: manifest.project.endDate,
  };
}
