import { maxUsableItemLevel, maxUsableScrollLevel } from '@site/src/utils/itemLevelLimits';
import { getRarityMultiplier } from '@site/src/utils/rarity';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import { PactId } from '../CharacterPlanner/PactDefinitions';
import { AppliedUpgrade, BaseStats, calculateCharacterStats, CharacterStats, EquippedItem, ItemSlotType, Upgrade } from '../CharacterPlanner/useCharacterState';
import { calculateDamageBonus } from '../Grindstone';
import type { BaseItem, ItemRarity, PrefixSuffix } from '../Item';
import { calculateArmourBonus } from '../ProtectiveGear';

const SLOT_TYPE_MAP: Record<ItemSlotType, string[]> = {
  helmet: ['helmets'],
  amulet: ['amulets'],
  chest: ['armour'],
  gloves: ['gloves'],
  mainHand: ['weapons'],
  offHand: ['shields'],
  ring1: ['rings'],
  ring2: ['rings'],
  shoes: ['shoes'],
};

// Ordered for optimal greedy convergence (weapons first for damage-based scoring)
const SLOT_ORDER: ItemSlotType[] = ['mainHand', 'offHand', 'helmet', 'chest', 'gloves', 'shoes', 'amulet', 'ring1', 'ring2'];

// Slots that receive a Grindstone (damage) enchant
const WEAPON_ENCHANT_SLOTS = new Set<ItemSlotType>(['mainHand']);
// Slots that receive a Protective-gear (armour) enchant
const ARMOUR_ENCHANT_SLOTS = new Set<ItemSlotType>(['helmet', 'chest', 'gloves', 'shoes', 'offHand']);
// Slots that receive stat powder upgrades
const POWDER_SLOTS = new Set<ItemSlotType>(['ring1', 'ring2', 'amulet']);

// Synthetic powder Upgrade objects — one per toggleable stat.
// calculateCharacterStats reads only .type and .stat from an Upgrade, so the
// other fields are irrelevant for simulation purposes.
const STAT_POWDERS: Record<keyof StatToggles, Upgrade> = {
  dexterity:    { name: 'Dexterity Powder',    type: 'powder', stat: 'dexterity',    applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
  agility:      { name: 'Agility Powder',      type: 'powder', stat: 'agility',      applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
  strength:     { name: 'Strength Powder',     type: 'powder', stat: 'strength',     applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
  intelligence: { name: 'Intelligence Powder', type: 'powder', stat: 'intelligence', applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
};

const TOP_K = 20;

export interface SimulationWeights {
  critDamage: number;
  block: number;
  damage: number;
  armor: number;
}

export interface StatToggles {
  dexterity: boolean;
  agility: boolean;
  strength: boolean;
  intelligence: boolean;
}

export interface SimulationResult {
  build: Map<ItemSlotType, EquippedItem>;
  stats: CharacterStats;
  score: number;
}

/** Default flat damage bonus from a Grindstone at the given scroll level and rarity. */
export function getDefaultWeaponEnchantValue(scrollLevel: number, rarity: ItemRarity): number {
  return calculateDamageBonus(scrollLevel, getRarityMultiplier(rarity));
}

/** Default flat armour bonus from a Protective Gear at the given scroll level and rarity. */
export function getDefaultArmourEnchantValue(scrollLevel: number, rarity: ItemRarity): number {
  return calculateArmourBonus(scrollLevel, getRarityMultiplier(rarity));
}

/**
 * Score a full character stats snapshot according to the user's priorities.
 *
 * Points per metric (before weight):
 *   Critical hit chance  → chance × 2          (50% cap → max 100 pts)
 *   Block chance         → chance × 2          (50% cap → max 100 pts)
 *   Armour               → armour / (level × 2.3)
 *   Damage (avg)         → (min + max) / 2 / 10
 *
 * Each metric's points are multiplied by its priority weight / 100 and summed.
 * Weights are independent (0–100) — no normalisation so each slider acts as a
 * direct multiplier, making the effect of changing a single weight intuitive.
 *
 * Additionally, four stat-efficiency bonuses are always added (unweighted):
 *   Dexterity    finalStat/maxStat × 100 × 1.0
 *   Agility      finalStat/maxStat × 100 × 0.8
 *   Strength     finalStat/maxStat × 100 × 0.5
 *   Intelligence finalStat/maxStat × 100 × 0.5
 */
function scoreStats(
  stats: CharacterStats,
  weights: SimulationWeights,
  characterLevel: number,
  baseStats: BaseStats,
  statToggles: StatToggles,
): number {
  const critPoints   = stats.criticalHitChance * 2;
  const blockPoints  = stats.blockChance * 2;
  const armorPoints  = stats.totalArmor / Math.max(1, characterLevel * 2.3);
  const avgDamage    = (stats.totalDamageMin + stats.totalDamageMax) / 2;
  const damagePoints = (avgDamage - characterLevel * 3.6) / 4.2;

  // Stat-efficiency score: rewards items that push a stat closer to its natural cap.
  // finalStat includes item flat/percent bonuses; maxStat is the training cap formula.
  const statEfficiency = (statName: string, baseStat: number, multiplier: number): number => {
    const bonus = stats.stats.get(statName) ?? { flat: 0, percent: 0 };
    const percentBonus = Math.round(baseStat * ((bonus.percent ?? 0) / 100));
    const uncapped = baseStat + (bonus.flat ?? 0) + percentBonus;
    const maxStat = baseStat + Math.floor(baseStat / 2) + characterLevel;
    return (Math.min(uncapped, maxStat) / Math.max(1, maxStat)) * 100 * multiplier;
  };

  return (
    (weights.critDamage / 100) * critPoints +
    (weights.block      / 100) * blockPoints +
    (weights.armor      / 100) * armorPoints +
    (weights.damage     / 100) * damagePoints +
    (statToggles.dexterity    ? statEfficiency('Dexterity',    baseStats.dexterity,    1.0) : 0) +
    (statToggles.agility      ? statEfficiency('Agility',      baseStats.agility,      0.8) : 0) +
    (statToggles.strength     ? statEfficiency('Strength',     baseStats.strength,     0.5) : 0) +
    (statToggles.intelligence ? statEfficiency('Intelligence', baseStats.intelligence, 0.5) : 0)
  );
}

/**
 * Estimate how much an affix (prefix or suffix) contributes to the scoring
 * metrics, using the same point scales as scoreStats so the pre-sort ranking
 * matches the full evaluation ordering as closely as possible.
 *
 * A 0.5 discount is applied to indirect stat conversions (e.g. Strength → damage
 * via floor(str/10)) to account for diminishing returns and stat caps.
 */
function estimateAffixScore(
  affix: PrefixSuffix,
  weights: SimulationWeights,
  characterLevel: number,
  baseStats: BaseStats,
  statToggles: StatToggles,
): number {
  let critPoints = 0;
  let blockPoints = 0;
  let armorPoints = 0;
  let damagePoints = 0;
  // Stat-efficiency points — added unweighted, same as in scoreStats
  let dexPoints = 0;
  let agiPoints = 0;
  let strPoints = 0;
  let intPoints = 0;

  const levelFactor = characterLevel > 8 ? 52 / (characterLevel - 8) : 0;

  // Helper: stat-efficiency contribution of a flat stat bonus
  const maxStat = (base: number) => Math.max(1, base + Math.floor(base / 2) + characterLevel);

  for (const [statKey, statVal] of Object.entries(affix.stats)) {
    if (!statVal) continue;
    const flat = (statVal as { flat: number; percent: number }).flat ?? 0;
    if (flat === 0) continue;

    switch (statKey) {
      case 'critical_attack_value':
        critPoints += Math.min((flat * levelFactor) / 5, 50) * 2;
        break;
      case 'block_value':
        blockPoints += Math.min((flat * levelFactor) / 6, 50) * 2;
        break;
      case 'armour':
        armorPoints += flat / Math.max(1, characterLevel * 2.5);
        break;
      case 'damage':
        damagePoints += flat / 5;
        break;
      case 'strength': {
        // Indirect: Strength → damage and block via floor(str/10)
        const indirect = Math.floor(flat / 10);
        damagePoints += (indirect / 5) * 0.5;
        blockPoints  += Math.min((indirect * levelFactor) / 6, 50) * 2 * 0.5;
        // Direct stat-efficiency contribution (gated by toggle)
        if (statToggles.strength) strPoints += (flat / maxStat(baseStats.strength)) * 100 * 0.5;
        break;
      }
      case 'dexterity': {
        // Indirect: Dexterity → critical attack value via floor(dex/10)
        const indirect = Math.floor(flat / 10);
        critPoints += Math.min((indirect * levelFactor) / 5, 50) * 2 * 0.5;
        // Direct stat-efficiency contribution (gated by toggle)
        if (statToggles.dexterity) dexPoints += (flat / maxStat(baseStats.dexterity)) * 100 * 1.0;
        break;
      }
      case 'agility': {
        // Indirect: Agility → resilience (crit-avoidance proxy)
        const indirect = Math.floor(flat / 10);
        const resGain = Math.min((indirect * levelFactor) / 4, 25);
        armorPoints += (resGain / 25) * (characterLevel / 2.5) * 0.3;
        // Direct stat-efficiency contribution (gated by toggle)
        if (statToggles.agility) agiPoints += (flat / maxStat(baseStats.agility)) * 100 * 0.8;
        break;
      }
      case 'intelligence': {
        // Direct stat-efficiency contribution only (gated by toggle)
        if (statToggles.intelligence) intPoints += (flat / maxStat(baseStats.intelligence)) * 100 * 0.5;
        break;
      }
      case 'constitution': {
        // Constitution → health proxy as armour
        armorPoints += (flat * 25) / Math.max(1, characterLevel * 2.5) * 0.2;
        break;
      }
      default:
        break;
    }
  }

  return (
    (weights.critDamage / 100) * critPoints +
    (weights.block      / 100) * blockPoints +
    (weights.armor      / 100) * armorPoints +
    (weights.damage     / 100) * damagePoints +
    dexPoints + agiPoints + strPoints + intPoints
  );
}

export function runSimulation(
  characterLevel: number,
  baseStats: BaseStats,
  activePacts: Set<PactId>,
  weights: SimulationWeights,
  statToggles: StatToggles,
  evaluationRarity: ItemRarity = 'red',
  weaponEnchantValue?: number,
  armourEnchantValue?: number,
): SimulationResult {
  const usableItemLevel = maxUsableItemLevel(characterLevel);
  const minBaseLevel = Math.max(1, characterLevel - 30);
  const usableScrolllevel = maxUsableScrollLevel(characterLevel);
  // Pre-score and sort affixes once — the ranking is weight-dependent but base-independent
  const scoredPrefixes = (prefixesData as PrefixSuffix[])
  .filter(prefix => prefix.level <= usableScrolllevel)
    .map(p => ({ prefix: p, score: estimateAffixScore(p, weights, characterLevel, baseStats, statToggles) }))
    .sort((a, b) => b.score - a.score);

  const scoredSuffixes = (suffixesData as PrefixSuffix[])
    .filter(prefix => prefix.level <= usableScrolllevel)
    .map(s => ({ suffix: s, score: estimateAffixScore(s, weights, characterLevel, baseStats, statToggles) }))
    .sort((a, b) => b.score - a.score);

  const currentBuild = new Map<ItemSlotType, EquippedItem>();

  // Three greedy passes let slots interact: later slots benefit from earlier choices
  for (let pass = 0; pass < 3; pass++) {
    for (const slot of SLOT_ORDER) {
      const validTypes = SLOT_TYPE_MAP[slot];

      let basesToTry = (basesData as BaseItem[]).filter(b =>
        validTypes.includes(b.type) &&
        b.level <= characterLevel &&
        b.level >= minBaseLevel,
      );

      // Fallback: if the level range has no bases for this slot, widen to all valid bases
      if (basesToTry.length === 0) {
        basesToTry = (basesData as BaseItem[]).filter(b =>
          validTypes.includes(b.type) && b.level <= characterLevel,
        );
      }

      if (basesToTry.length === 0) continue;

      let bestScore = -Infinity;
      let bestItem: EquippedItem | null = null;

      for (const base of basesToTry) {
        const remainingBudget = usableItemLevel - base.level;

        // Top-K prefixes within level budget, plus the "no prefix" option
        const topPrefixes: (PrefixSuffix | undefined)[] = [
          undefined,
          ...scoredPrefixes
            .filter(({ prefix }) => prefix.level <= remainingBudget)
            .slice(0, TOP_K)
            .map(({ prefix }) => prefix),
        ];

        for (const prefix of topPrefixes) {
          const suffixBudget = remainingBudget - (prefix?.level ?? 0);

          const topSuffixes: (PrefixSuffix | undefined)[] = [
            undefined,
            ...scoredSuffixes
              .filter(({ suffix }) => suffix.level <= suffixBudget)
              .slice(0, TOP_K)
              .map(({ suffix }) => suffix),
          ];

          for (const suffix of topSuffixes) {
            const itemLevel = (base.level ?? 0) + (prefix?.level ?? 0) + (suffix?.level ?? 0);
            const enchantValue = WEAPON_ENCHANT_SLOTS.has(slot)
              ? (weaponEnchantValue ?? getDefaultWeaponEnchantValue(characterLevel, evaluationRarity))
              : ARMOUR_ENCHANT_SLOTS.has(slot)
                ? (armourEnchantValue ?? getDefaultArmourEnchantValue(characterLevel, evaluationRarity))
                : undefined;

            // For ring/amulet slots, try each enabled stat powder as a variant
            const powderVariants: (AppliedUpgrade | undefined)[] = [undefined];
            if (POWDER_SLOTS.has(slot)) {
              const powderLevel = Math.floor(characterLevel / 5);
              for (const [key, enabled] of Object.entries(statToggles) as [keyof StatToggles, boolean][]) {
                if (enabled) {
                  powderVariants.push({ upgrade: STAT_POWDERS[key], level: powderLevel });
                }
              }
            }

            for (const powder of powderVariants) {
              const candidate: EquippedItem = {
                baseItem: base,
                prefix,
                suffix,
                rarity: evaluationRarity,
                conditioned: true,
                ...(enchantValue !== undefined && { enchantValue }),
                ...(powder !== undefined && { upgrades: [powder] }),
              };

              const testBuild = new Map(currentBuild);
              testBuild.set(slot, candidate);
              const stats = calculateCharacterStats(testBuild, characterLevel, baseStats, activePacts);
              const score = scoreStats(stats, weights, characterLevel, baseStats, statToggles);

              if (score > bestScore) {
                bestScore = score;
                bestItem = candidate;
              }
            }
          }
        }
      }

      if (bestItem !== null) {
        currentBuild.set(slot, bestItem);
      }
    }
  }

  const finalStats = calculateCharacterStats(currentBuild, characterLevel, baseStats, activePacts);
  return {
    build: currentBuild,
    stats: finalStats,
    score: scoreStats(finalStats, weights, characterLevel, baseStats, statToggles),
  };
}
