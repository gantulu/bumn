import { Bookmark,Home,Search,User } from "lucide-react";
import type { AppTab } from "../../types/job";
const items=[{id:"home",label:"Beranda",icon:Home},{id:"search",label:"Cari Kerja",icon:Search},{id:"saved",label:"Tersimpan",icon:Bookmark},{id:"profile",label:"Profil",icon:User}] as const;
export function BottomNav({activeTab,onChange}:{activeTab:AppTab;onChange:(tab:AppTab)=>void}){return <nav className="bottom-nav" aria-label="Navigasi utama">{items.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={`nav-item ${activeTab===item.id?"active":""}`} aria-current={activeTab===item.id?"page":undefined} onClick={()=>onChange(item.id)}><Icon size={21}/>{item.label}</button>;})}</nav>;}
