/**
 * Item-level limit formulas for the Character Planner.
 *
 * See docs/game-guide/index.md → "Item level formulas (low levels)".
 */

/** Final item level = base + prefix + suffix levels. */
export function computeItemLevel(
  baseLevel: number,
  prefixLevel = 0,
  suffixLevel = 0,
): number {
  return baseLevel + prefixLevel + suffixLevel;
}

/** Max item level the character can wear. */
export function maxUsableItemLevel(characterLevel: number): number {
  return characterLevel >= 33
    ? characterLevel + 16
    : Math.ceil(1.25 * characterLevel + 7.75);
}

/** Max scroll level the character can use. */
export function maxUsableScrollLevel(characterLevel: number): number {
  return characterLevel + 1;
}

/** Max item level visible in the Market. */
export function maxMarketItemLevel(characterLevel: number): number {
  return characterLevel >= 36
    ? characterLevel + 9
    : Math.floor(1.25 * characterLevel);
}

/** Min item level visible in the Auction. */
export function minAuctionItemLevel(characterLevel: number): number {
  return Math.floor(0.75 * characterLevel);
}

/** Max item level visible in the Auction. */
export function maxAuctionItemLevel(characterLevel: number): number {
  return characterLevel >= 33
    ? characterLevel + 14
    : Math.ceil(1.25 * characterLevel + 5.75);
}
