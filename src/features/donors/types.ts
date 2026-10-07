import { donors, donations } from "@/lib/db/schema";

export type Donor = typeof donors.$inferSelect;
type DonationBase = typeof donations.$inferSelect;

export interface Donation extends DonationBase {
  donor: {
    id: string;
    name: string;
  } | null;
}

export interface DonationStats {
  totalBooks: number;
  totalDonors: number;
}
