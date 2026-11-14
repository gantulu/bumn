import { useEffect,useState } from "react";
const KEY="bumn-career:saved-jobs";
function load():string[]{try{const v:unknown=JSON.parse(localStorage.getItem(KEY)??"[]");return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];}catch{return [];}}
export function useSavedJobs(){
 const [savedIds,setSavedIds]=useState<string[]>(load);
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(savedIds));},[savedIds]);
 const toggleSaved=(id:string)=>setSavedIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 return {savedIds,toggleSaved,isSaved:(id:string)=>savedIds.includes(id)};
}
