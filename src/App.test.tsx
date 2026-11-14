import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("BUMN Career application", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    window.location.hash = "#/";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the home page", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Temukan Karier Impianmu!" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigasi utama" })).toBeInTheDocument();
  });

  it("filters jobs by search query", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Cari Kerja" }));
    await user.type(screen.getByPlaceholderText("Posisi, perusahaan, lokasi..."), "IT Specialist");
    expect(screen.getByRole("heading", { name: "IT Specialist" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Management Trainee" })).not.toBeInTheDocument();
  });

  it("saves a job and shows it on the saved page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Simpan lowongan" })[0]);
    await user.click(screen.getByRole("button", { name: "Tersimpan" }));
    expect(screen.getByRole("heading", { name: "Lowongan Tersimpan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Management Trainee" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("bumn_saved_jobs") ?? "[]")).toContain("LKG-001");
  });

  it("keeps the guest application explicitly in simulation mode", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Detail" })[0]);
    await user.click(screen.getByRole("button", { name: "Lamar Sekarang" }));
    await user.type(screen.getByLabelText("Nama lengkap"), "Pengguna Demo");
    await user.type(screen.getByLabelText("Email"), "demo@example.com");
    await user.type(screen.getByLabelText("Nomor telepon"), "081234567890");
    await user.selectOptions(screen.getByLabelText("Pendidikan terakhir"), "S1");
    await user.click(screen.getByRole("button", { name: "Kirim Simulasi Lamaran" }));
    expect(screen.getByText(/Data yang kamu isi tidak disimpan dan tidak dikirim ke perusahaan/i)).toBeInTheDocument();
  });
});
