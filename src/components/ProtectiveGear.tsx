import React from 'react';
import ConsumableTooltip from './ConsumableTooltip';
import type { ItemRarity } from './Item';
import { getRarityMultiplier } from '@site/src/utils/rarity';

type ProtectiveGearProps = {
  level: number;
  rarity?: ItemRarity;
};

const SPRITE_CLASS = 'item-i-12-4';
const HINT = 'Pull that item onto another one, to boost it.';
const GOLD_BASE_COEFFICIENT = 8.25;

function calculateArmourBonus(level: number, multiplier: number): number {
  return Math.floor(Math.ceil(level * 2) * multiplier);
}

function calculateGoldValue(level: number): number {
  return Math.round(level ** 1.5 * GOLD_BASE_COEFFICIENT);
}

export default function ProtectiveGear({
  level,
  rarity = 'green',
}: ProtectiveGearProps) {
  const multiplier = getRarityMultiplier(rarity);
  const armour = calculateArmourBonus(level, multiplier);
  const value = calculateGoldValue(level);
  const minItemLevel = Math.max(0, level - 5);

  return (
    <ConsumableTooltip
      name="Protective gear"
      rarity={rarity}
      spriteClass={SPRITE_CLASS}
      effect={`+${armour} Armour`}
      useOn="Armour"
      duration="Permanent"
      minItemLevel={minItemLevel}
      level={level}
      value={value}
      hint={HINT}
    />
  );
}
