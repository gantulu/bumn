import { useEffect, useMemo, useState } from "react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { Header } from "./components/layout/Header";
import { categories, jobs } from "./data/jobs";
import { ApplicationPage } from "./pages/ApplicationPage";
import { HomePage } from "./pages/HomePage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SavedJobsPage } from "./pages/SavedJobsPage";
import { SearchPage } from "./pages/SearchPage";
import { readSavedJobs, writeSavedJobs } from "./services/storageService";
import type { AppTab, Job } from "./types/job";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [savedIds, setSavedIds] = useState<string[]>(readSavedJobs);

  const isDetailPage = /^\/lowongan\/[^/]+$/.test(location.pathname);
  const isApplicationPage = /^\/lamar\/[^/]+$/.test(location.pathname);
  const activeTab: AppTab = location.pathname.startsWith("/lowongan")
    ? "search"
    : location.pathname === "/tersimpan"
      ? "saved"
      : location.pathname === "/profil"
        ? "profile"
        : "home";

  useEffect(() => {
    writeSavedJobs(savedIds);
  }, [savedIds]);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesSearch = [job.title, job.company, job.location, job.category]
      .join(" ").toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID"));
    const matchesCategory = category === "Semua" || job.category === category;
    return matchesSearch && matchesCategory;
  }), [search, category]);

  const savedJobs = useMemo(() => jobs.filter((job) => savedIds.includes(job.id)), [savedIds]);

  const toggleSaved = (id: string) => {
    setSavedIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id]);
  };

  const openJob = (job: Job) => {
    navigate("/lowongan/" + job.id, { state: { from: location.pathname } });
  };

  const openSearch = () => navigate("/lowongan");
  const selectCategory = (value: string) => {
    setCategory(value);
    navigate("/lowongan");
  };
  const changeTab = (tab: AppTab) => {
    const paths: Record<AppTab, string> = {
      home: "/",
      search: "/lowongan",
      saved: "/tersimpan",
      profile: "/profil"
    };
    navigate(paths[tab]);
  };
  const goBackFromDetail = () => {
    const state = location.state as { from?: string } | null;
    navigate(state?.from ?? "/lowongan");
  };

  return (
    <div className="app-container">
      <Header isDetail={isDetailPage} onBack={goBackFromDetail} />
      <main className={"main-content " + (isDetailPage ? "detail-main" : "")}>
        <Routes>
          <Route path="/" element={<HomePage jobs={jobs} savedIds={savedIds}
            onSearchChange={(value) => { setSearch(value); navigate("/lowongan"); }}
            onSearchSubmit={openSearch} onSelectCategory={selectCategory}
            onToggleSaved={toggleSaved} onOpenJob={openJob} />} />
          <Route path="/lowongan" element={<SearchPage jobs={filteredJobs} query={search} category={category}
            savedIds={savedIds} onQueryChange={setSearch} onCategoryChange={setCategory}
            onToggleSaved={toggleSaved} onOpenJob={openJob} />} />
          <Route path="/lowongan/:id" element={<JobDetailPage jobs={jobs} savedIds={savedIds}
            onToggleSaved={toggleSaved} onApply={(job) => navigate("/lamar/" + job.id)} />} />
          <Route path="/tersimpan" element={<SavedJobsPage jobs={savedJobs} savedIds={savedIds}
            onToggleSaved={toggleSaved} onOpenJob={openJob} />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/lamar/:id" element={<ApplicationPage jobs={jobs} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isDetailPage && !isApplicationPage && <BottomNav activeTab={activeTab} onChange={changeTab} />}
    </div>
  );
}

export default function App() {
  return <HashRouter><AppContent /></HashRouter>;
}
