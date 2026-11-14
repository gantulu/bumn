import { useEffect, useState } from "react";
import { jobsRepository } from "../services/jobService";
import type { Job } from "../types/job";

interface JobsState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
}

export function useJobs() {
  const [state, setState] = useState<JobsState>({ jobs: [], loading: true, error: null });

  useEffect(() => {
    let active = true;

    jobsRepository.list()
      .then((jobs) => {
        if (active) setState({ jobs, loading: false, error: null });
      })
      .catch((reason: unknown) => {
        if (active) setState({
          jobs: [],
          loading: false,
          error: reason instanceof Error ? reason.message : "Tidak dapat memuat lowongan."
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
