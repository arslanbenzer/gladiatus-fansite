import React from 'react';
import ConsumableTooltip from './ConsumableTooltip';
import type { ItemRarity } from './Item';
import { getRarityMultiplier } from '@site/src/utils/rarity';

type GrindstoneProps = {
  level: number;
  rarity?: ItemRarity;
};

const SPRITE_CLASS = 'item-i-12-2';
const HINT = 'Pull that item onto another one, to boost it.';
const GOLD_BASE_COEFFICIENT = 16.5;

export function calculateDamageBonus(level: number, multiplier: number): number {
  return Math.floor(Math.ceil(level / 5) * multiplier);
}

function calculateGoldValue(level: number): number {
  return Math.round(level ** 1.5 * GOLD_BASE_COEFFICIENT);
}

export default function Grindstone({
  level,
  rarity = 'green',
}: GrindstoneProps) {
  const multiplier = getRarityMultiplier(rarity);
  const damage = calculateDamageBonus(level, multiplier);
  const value = calculateGoldValue(level);
  const minItemLevel = Math.max(0, level - 5);

  return (
    <ConsumableTooltip
      name="Grindstone"
      rarity={rarity}
      spriteClass={SPRITE_CLASS}
      effect={`+${damage} Damage`}
      useOn="Weapons"
      duration="Permanent"
      minItemLevel={minItemLevel}
      level={level}
      value={value}
      hint={HINT}
    />
  );
}
