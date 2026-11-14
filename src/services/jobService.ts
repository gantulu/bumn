import { jobs } from "../data/jobs";
import type { Job } from "../types/job";

export interface JobsRepository {
  list(): Promise<Job[]>;
  getById(id: string): Promise<Job | undefined>;
}

/**
 * Local demo adapter implementing the repository contract.
 * A future API adapter can replace this implementation without coupling pages to transport details.
 */
export const jobsRepository: JobsRepository = {
  async list() {
    return jobs;
  },
  async getById(id) {
    return jobs.find((job) => job.id === id);
  }
};
