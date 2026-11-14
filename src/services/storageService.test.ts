import { beforeEach, describe, expect, it } from "vitest";
import { readSavedJobs, writeSavedJobs } from "./storageService";

describe("saved jobs storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty list when no saved jobs exist", () => {
    expect(readSavedJobs()).toEqual([]);
  });

  it("persists saved job identifiers", () => {
    expect(writeSavedJobs(["LKG-001", "LKG-002"])).toBe(true);
    expect(readSavedJobs()).toEqual(["LKG-001", "LKG-002"]);
  });

  it("ignores malformed and non-string stored values", () => {
    localStorage.setItem("bumn_saved_jobs", JSON.stringify(["LKG-001", 42, null]));
    expect(readSavedJobs()).toEqual(["LKG-001"]);
    localStorage.setItem("bumn_saved_jobs", "{invalid");
    expect(readSavedJobs()).toEqual([]);
  });
});
