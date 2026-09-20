import {
  ProjectRepositoryError,
  type ProjectRepository,
} from "@/lib/projects/repository";
import type { Project, ProjectInput } from "@/types/task";

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: string;
    code?: string;
    requestId?: string;
    detail?: string;
  } | null;
  if (!response.ok)
    throw new ProjectRepositoryError(
      body?.error ?? "Project service unavailable.",
      {
        code: body?.code,
        requestId: body?.requestId,
        detail: body?.detail,
      },
    );
  return body?.data as T;
}

export class RemoteProjectRepository implements ProjectRepository {
  list() {
    return request<Project[]>("/api/projects");
  }
  create(input: ProjectInput) {
    return request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
