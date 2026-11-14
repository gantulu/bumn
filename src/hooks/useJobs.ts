import { useEffect,useState } from "react";
import { jobsRepository } from "../services/jobs.service";
import type { Job } from "../types/job";
export function useJobs(){
 const [jobs,setJobs]=useState<Job[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  jobsRepository.list().then(data=>{if(active)setJobs(data);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Tidak dapat memuat lowongan.");}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 return {jobs,loading,error};
}
