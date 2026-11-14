import { jobs } from "../data/jobs";
import type { Job } from "../types/job";
const API_BASE_URL=import.meta.env.VITE_API_BASE_URL?.replace(/\/$/,"");
export interface JobsRepository { list():Promise<Job[]>; getById(id:string):Promise<Job|undefined>; }
/** Local demo adapter. Connect a real endpoint only after its API contract is confirmed. */
export const jobsRepository:JobsRepository={
 async list(){if(!API_BASE_URL)return jobs;const response=await fetch(`${API_BASE_URL}/jobs`);if(!response.ok)throw new Error("Gagal memuat lowongan.");return response.json() as Promise<Job[]>;},
 async getById(id){return (await this.list()).find(job=>job.id===id);}
};
