import { jobs } from "../data/jobs";
import type { Job } from "../types/job";
const API_BASE_URL=import.meta.env.VITE_API_BASE_URL?.replace(/\/$/,"");
export interface JobsRepository { list():Promise<Job[]>; getById(id:string):Promise<Job|undefined>; }
/**
 * Local demo adapter. If VITE_API_BASE_URL is configured, this expects
 * GET {VITE_API_BASE_URL}/jobs to return Job[]. Confirm this provisional
 * contract with the backend before connecting production data.
 */
async function listJobs():Promise<Job[]>{
 if(!API_BASE_URL)return jobs;
 const response=await fetch(`${API_BASE_URL}/jobs`);
 if(!response.ok)throw new Error("Gagal memuat lowongan.");
 return response.json() as Promise<Job[]>;
}
export const jobsRepository:JobsRepository={
 list:listJobs,
 async getById(id){return (await listJobs()).find(job=>job.id===id);}
};
