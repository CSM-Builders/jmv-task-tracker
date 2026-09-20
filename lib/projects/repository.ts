import type { Project, ProjectInput } from "@/types/task";

export interface ProjectRepository {
  list(): Promise<Project[]>;
  create(input: ProjectInput): Promise<Project>;
}

export class ProjectRepositoryError extends Error {
  code?: string;
  requestId?: string;
  detail?: string;

  constructor(
    message: string,
    metadata: { code?: string; requestId?: string; detail?: string } = {},
  ) {
    super(message);
    this.name = "ProjectRepositoryError";
    this.code = metadata.code;
    this.requestId = metadata.requestId;
    this.detail = metadata.detail;
  }
}
