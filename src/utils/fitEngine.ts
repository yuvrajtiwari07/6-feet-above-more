// src/utils/fitEngine.ts
import { FitVerdict } from '../types';

/**
 * Parses height strings like "6'3\"", "6'3", "6'0", "6'8\"+" into total inches.
 */
export function parseHeightToInches(h: string): number {
  if (!h) return 0;
  // Normalize string: remove spaces, double quotes, and clean up
  const clean = h.replace(/[\s"]/g, '');
  
  // Split feet and inches
  const parts = clean.split("'");
  const feet = parseInt(parts[0], 10) || 0;
  
  // Handle case where inches has '+' like "8+" or is just a number
  let inchesStr = parts[1] || '0';
  if (inchesStr.endsWith('+')) {
    inchesStr = inchesStr.slice(0, -1);
  }
  const inches = parseInt(inchesStr, 10) || 0;
  
  return (feet * 12) + inches;
}

/**
 * Checks if a user height string falls within a configured height range band.
 * Supports ranges like "6'2\" - 6'4\"", open-ended ranges like "6'8\"+", or exact matches.
 */
export function isHeightInBand(userHeight: string, bandStr: string): boolean {
  if (!userHeight || !bandStr) return false;

  const cleanUser = userHeight.trim().replace(/"/g, '');
  const cleanBand = bandStr.trim().replace(/"/g, '');

  if (cleanUser === cleanBand) return true;

  // Handle open ended ranges like "6'8\"+" or "6'6+"
  if (cleanBand.endsWith('+')) {
    const baseHeight = cleanBand.slice(0, -1);
    const userInches = parseHeightToInches(cleanUser);
    const baseInches = parseHeightToInches(baseHeight);
    return userInches >= baseInches;
  }

  // Handle closed ranges like "6'2\" - 6'4\"" or "6'2-6'4"
  if (cleanBand.includes('-')) {
    const parts = cleanBand.split('-');
    if (parts.length === 2) {
      const minInches = parseHeightToInches(parts[0]);
      const maxInches = parseHeightToInches(parts[1]);
      const userInches = parseHeightToInches(cleanUser);
      return userInches >= minInches && userInches <= maxInches;
    }
  }

  // Fallback direct match of total inches
  return parseHeightToInches(cleanUser) === parseHeightToInches(cleanBand);
}

/**
 * Maps the profile body build string to the product configuration body type string.
 */
export function mapProfileBodyType(bt: string): 'Slim' | 'Athletic' | 'Broad' | 'Overweight' {
  const normalized = bt.trim().toLowerCase();
  if (normalized === 'lean' || normalized === 'slim') return 'Slim';
  if (normalized === 'heavy' || normalized === 'overweight') return 'Overweight';
  if (normalized === 'broad') return 'Broad';
  return 'Athletic'; // Default fallback
}

/**
 * Finds the matching recommendation from the product's verdicts list.
 */
export function getProductRecommendation(
  verdicts: FitVerdict[],
  userHeight: string,
  userBodyType: string
): FitVerdict | undefined {
  if (!verdicts || !Array.isArray(verdicts)) return undefined;

  const mappedBody = mapProfileBodyType(userBodyType);

  // 1. Direct match: both height range and body type match
  const exactMatch = verdicts.find(
    v => v && v.heightRange && isHeightInBand(userHeight, v.heightRange) && v.bodyTypes && v.bodyTypes.includes(mappedBody)
  );
  
  let matched = exactMatch;
  if (!matched) {
    // 2. Fallback: match height range only (grab first recommendation or default)
    matched = verdicts.find(v => v && v.heightRange && isHeightInBand(userHeight, v.heightRange));
  }

  // 3. Fallback to legacy verdicts (e.g. v.band) if no range matched
  if (!matched) {
    // Determine user's legacy heightBand to match legacy verdict
    const cleanUser = userHeight.trim().replace(/"/g, '');
    let bandKey = '6_0_6_1';
    if (cleanUser.includes("6'2") || cleanUser.includes("6'3")) bandKey = '6_2_6_3';
    else if (cleanUser.includes("6'4") || cleanUser.includes("6'5")) bandKey = '6_4_6_5';
    else if (cleanUser.includes("6'6") || cleanUser.includes("6'7") || cleanUser.includes("6'8") || cleanUser.includes("6'9") || cleanUser.includes("+")) bandKey = '6_6_plus';

    const legacyMatch = verdicts.find((v: any) => v && v.band === bandKey);
    if (legacyMatch) {
      // Map it to FitVerdict
      let fitRecommendation = 'Good Fit';
      const status = (legacyMatch as any).status;
      if (status === 'verified') fitRecommendation = 'Highly Recommended';
      else if (status === 'friendly') fitRecommendation = 'Recommended';
      else if (status === 'runs_short') fitRecommendation = 'Not Recommended';

      let heightRange = "6'0\" - 6'2\"";
      if (bandKey === '6_2_6_3') heightRange = "6'2\" - 6'4\"";
      else if (bandKey === '6_4_6_5') heightRange = "6'4\" - 6'6\"";
      else if (bandKey === '6_6_plus') heightRange = "6'8\"+";

      return {
        heightRange,
        bodyTypes: [mappedBody],
        fitRecommendation
      };
    }
  }

  if (matched) {
    // Ensure all properties exist
    return {
      heightRange: matched.heightRange || "6'2\" - 6'4\"",
      bodyTypes: matched.bodyTypes || [mappedBody],
      fitRecommendation: matched.fitRecommendation || 'Good Fit'
    };
  }

  return undefined;
}

/**
 * Checks if a fit recommendation is considered generally positive.
 */
export function isPositiveRecommendation(rec: string): boolean {
  const r = rec.toLowerCase();
  return (
    r.includes('highly recommended') ||
    r.includes('recommended') ||
    r.includes('good fit') ||
    r.includes('relaxed fit') ||
    r.includes('oversized fit')
  );
}
