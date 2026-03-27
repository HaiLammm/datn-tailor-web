"use server";

/**
 * Server actions for Cart verification - Story 3.2: Render Cart Checkout Details
 * Verifies cart items against Backend (Authoritative Server Pattern).
 */

import { fetchGarmentDetail } from "./garment-actions";
import { parsePrice } from "@/utils/format";

export interface VerifyCartItem {
  garment_id: string;
  transaction_type: "buy" | "rent" | "bespoke";
}

export interface VerifyResult {
  garment_id: string;
  is_available: boolean;
  verified_rental_price: number;
  verified_sale_price: number;
  current_status: string;
}

/**
 * Verify cart items against Backend for price and availability.
 * Uses existing fetchGarmentDetail for each item (no new backend endpoint needed).
 */
export async function verifyCartItems(
  items: VerifyCartItem[]
): Promise<VerifyResult[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const garment = await fetchGarmentDetail(item.garment_id);
        if (!garment) {
          return {
            garment_id: item.garment_id,
            is_available: false,
            verified_rental_price: 0,
            verified_sale_price: 0,
            current_status: "deleted",
          };
        }
        return {
          garment_id: item.garment_id,
          is_available: garment.status === "available",
          verified_rental_price: parsePrice(garment.rental_price),
          verified_sale_price: parsePrice(garment.sale_price),
          current_status: garment.status,
        };
      } catch {
        return {
          garment_id: item.garment_id,
          is_available: false,
          verified_rental_price: 0,
          verified_sale_price: 0,
          current_status: "error",
        };
      }
    })
  );
  return results;
}
