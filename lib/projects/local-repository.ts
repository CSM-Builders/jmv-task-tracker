import type { ProjectRepository } from "@/lib/projects/repository";
import { projectInputSchema } from "@/lib/validation/task";
import type { Project, ProjectInput } from "@/types/task";

const PROJECTS_KEY = "jmv-task-tracker.projects.v1";

function readProjects(): Project[] {
  const value = window.localStorage.getItem(PROJECTS_KEY);
  return value ? (JSON.parse(value) as Project[]) : [];
}

export class LocalProjectRepository implements ProjectRepository {
  async list() {
    return readProjects();
  }
  async create(raw: ProjectInput) {
    const input = projectInputSchema.parse(raw);
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      userId: "demo-user",
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    window.localStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify([...readProjects(), project]),
    );
    return project;
  }
}
