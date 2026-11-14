export interface Job {
  id: string;
  title: string;
  company: string;
  category: string;
  location: string;
  employmentType: string;
  education: string;
  salary?: {
    minimum?: number;
    maximum?: number;
    currency: "IDR";
    period?: string;
  };
  description: string;
  qualifications: string[];
  publishedAt?: string;
  closingAt?: string;
  applicationUrl?: string;
  sourceUrl?: string;
  verificationStatus: "verified" | "unverified" | "sample";
  coverImageUrl?: string;
}

export type AppTab = "home" | "search" | "saved" | "profile";
