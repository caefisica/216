"use server";

import { listDonors, listDonatedCopies, getDonationStats } from "./repository";

export async function getDonors() {
  return listDonors();
}

export async function getDonatedCopies() {
  return listDonatedCopies();
}

export async function getDonationsStats() {
  return getDonationStats();
}
