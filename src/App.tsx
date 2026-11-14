import { useMemo,useState } from "react";
import { BottomNav } from "./components/layout/BottomNav";
import { Header } from "./components/layout/Header";
import { JobDetailDialog } from "./components/jobs/JobDetailDialog";
import { HomePage } from "./features/home/HomePage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { SavedPage } from "./features/saved/SavedPage";
import { SearchPage } from "./features/search/SearchPage";
import { useJobs } from "./hooks/useJobs";
import { useSavedJobs } from "./hooks/useSavedJobs";
import type { AppTab,Job } from "./types/job";
export default function App(){
 const [activeTab,setActiveTab]=useState<AppTab>("home");
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("Semua");
 const [selectedJob,setSelectedJob]=useState<Job|null>(null);
 const {jobs,loading,error}=useJobs();
 const {savedIds,toggleSaved,isSaved}=useSavedJobs();
 const filteredJobs=useMemo(()=>jobs.filter(job=>{
  const term=search.trim().toLocaleLowerCase("id");
  const matchesQuery=!term||[job.title,job.company,job.location,job.category].some(value=>value.toLocaleLowerCase("id").includes(term));
  return matchesQuery&&(category==="Semua"||job.category===category);
 }),[jobs,search,category]);
 const openSearch=(query=search,nextCategory=category)=>{setSearch(query);setCategory(nextCategory);setActiveTab("search");};
 const changeTab=(tab:AppTab)=>{setSelectedJob(null);setActiveTab(tab);};
 return <div className="app-container"><Header/><main className="main-content">
 {loading&&<p className="data-status" role="status">Memuat lowongan...</p>}
 {error&&<p className="data-error" role="alert">{error}</p>}
 {activeTab==="home"&&<HomePage jobs={jobs} savedIds={savedIds} onSearch={q=>openSearch(q)} onCategory={c=>openSearch("",c)} onToggleSaved={toggleSaved} onOpenJob={setSelectedJob}/>}
 {activeTab==="search"&&<SearchPage jobs={filteredJobs} query={search} category={category} savedIds={savedIds} onQuery={setSearch} onCategory={setCategory} onToggleSaved={toggleSaved} onOpenJob={setSelectedJob}/>}
 {activeTab==="saved"&&<SavedPage jobs={jobs.filter(job=>isSaved(job.id))} savedIds={savedIds} onToggleSaved={toggleSaved} onOpenJob={setSelectedJob}/>}
 {activeTab==="profile"&&<ProfilePage/>}
 </main><BottomNav activeTab={activeTab} onChange={changeTab}/>{selectedJob&&<JobDetailDialog job={selectedJob} saved={isSaved(selectedJob.id)} onClose={()=>setSelectedJob(null)} onToggleSaved={toggleSaved}/>}</div>;
}
