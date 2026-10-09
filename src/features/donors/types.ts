import type { listDonatedCopies, listDonors } from "./repository";

export type Donor = Awaited<ReturnType<typeof listDonors>>[number];
export type DonatedCopy = Awaited<ReturnType<typeof listDonatedCopies>>[number];

export interface DonationStats {
  totalCopies: number;
  totalDonors: number;
}
