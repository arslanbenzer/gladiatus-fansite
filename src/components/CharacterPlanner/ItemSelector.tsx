import React, { useState, useMemo, useEffect } from 'react';
import styles from './ItemSelector.module.css';
import { ItemSlotType, EquippedItem, Upgrade, AppliedUpgrade } from './useCharacterState';
import Item, { BaseItem, PrefixSuffix, ItemRarity } from '../Item';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import upgradesData from '@site/static/data/items/upgrades.json';
import { maxUsableItemLevel } from '@site/src/utils/itemLevelLimits';

interface ItemSelectorProps {
  readonly slotType: ItemSlotType;
  readonly characterLevel: number;
  readonly currentItem: EquippedItem | null;
  readonly onSelect: (item: EquippedItem) => void;
  readonly onClose: () => void;
  readonly strictItemLevel: boolean;
}

// Map slot types to item types
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

/**
 * Modal for selecting items to equip
 * Shows filterable list of base items with options for prefix/suffix/rarity
 */
export default function ItemSelector({
  slotType,
  characterLevel,
  currentItem,
  onSelect,
  onClose,
  strictItemLevel,
}: ItemSelectorProps) {
  const [selectedBase, setSelectedBase] = useState<BaseItem | null>(currentItem?.baseItem || null);
  const [selectedPrefix, setSelectedPrefix] = useState<PrefixSuffix | null>(currentItem?.prefix || null);
  const [selectedSuffix, setSelectedSuffix] = useState<PrefixSuffix | null>(currentItem?.suffix || null);
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity>(currentItem?.rarity || 'green');
  const [conditioned, setConditioned] = useState(currentItem?.conditioned || false);
  const [enchantValue, setEnchantValue] = useState<number>(currentItem?.enchantValue || 0);
  const [selectedUpgrades, setSelectedUpgrades] = useState<AppliedUpgrade[]>(currentItem?.upgrades || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [prefixSearch, setPrefixSearch] = useState('');
  const [suffixSearch, setSuffixSearch] = useState('');

  const wearableCap = maxUsableItemLevel(characterLevel);

  // Get available base items for this slot type
  const availableBaseItems = useMemo(() => {
    const allowedTypes = SLOT_TYPE_MAP[slotType];
    return (basesData as BaseItem[]).filter((item) => {
      if (!allowedTypes.includes(item.type)) return false;
      if (strictItemLevel && (item.level ?? 0) > wearableCap) return false;
      return true;
    });
  }, [slotType, strictItemLevel, wearableCap]);

  // Filter items based on search and level
  const filteredItems = useMemo(() => {
    return availableBaseItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === null || item.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [availableBaseItems, searchTerm, levelFilter]);

  // Get available prefixes/suffixes
  const availablePrefixes = useMemo(() => {
    return (prefixesData as PrefixSuffix[]);
  }, []);

  const availableSuffixes = useMemo(() => {
    return (suffixesData as PrefixSuffix[]);
  }, []);

  // Filter prefixes/suffixes by search term and strict item level
  const filteredPrefixes = useMemo(() => {
    const searchTerm = prefixSearch.toLowerCase();
    return availablePrefixes.filter((prefix) => {
      if (searchTerm && !prefix.name.toLowerCase().includes(searchTerm)) {
        return false;
      }
      if (strictItemLevel && selectedBase) {
        const combined =
          (selectedBase.level ?? 0) +
          prefix.level +
          (selectedSuffix?.level ?? 0);
        if (combined > wearableCap) return false;
      }
      return true;
    });
  }, [
    availablePrefixes,
    prefixSearch,
    strictItemLevel,
    selectedBase,
    selectedSuffix,
    wearableCap,
  ]);

  const filteredSuffixes = useMemo(() => {
    const searchTerm = suffixSearch.toLowerCase();
    return availableSuffixes.filter((suffix) => {
      if (searchTerm && !suffix.name.toLowerCase().includes(searchTerm)) {
        return false;
      }
      if (strictItemLevel && selectedBase) {
        const combined =
          (selectedBase.level ?? 0) +
          (selectedPrefix?.level ?? 0) +
          suffix.level;
        if (combined > wearableCap) return false;
      }
      return true;
    });
  }, [
    availableSuffixes,
    suffixSearch,
    strictItemLevel,
    selectedBase,
    selectedPrefix,
    wearableCap,
  ]);

  // Get available upgrades for the selected item type
  // Only show powders in upgrades list (enchants like Grindstone/Protective gear have their own field)
  const availableUpgrades = useMemo(() => {
    if (!selectedBase) return [];
    return (upgradesData as Upgrade[]).filter(upgrade => 
      upgrade.applicableTo.includes(selectedBase.type) && upgrade.type === 'powder'
    );
  }, [selectedBase]);

  // Clear enchantValue when rings or amulets are selected (they can't have protective gear)
  useEffect(() => {
    if (selectedBase && (selectedBase.type === 'rings' || selectedBase.type === 'amulets')) {
      setEnchantValue(0);
    }
  }, [selectedBase]);

  useEffect(() => {
    if (!strictItemLevel) return;
    if (!selectedBase || !selectedPrefix) return;
    const combined =
      (selectedBase.level ?? 0) +
      selectedPrefix.level +
      (selectedSuffix?.level ?? 0);
    if (combined > wearableCap) {
      setSelectedPrefix(null);
    }
  }, [strictItemLevel, selectedBase, selectedPrefix, selectedSuffix, wearableCap]);

  // Two separate effects (not one) so each one only fires when its own
  // dependency actually changes. Both depend on the same set of values but
  // only one branch calls a setter, so they cannot loop on each other.
  useEffect(() => {
    if (!strictItemLevel) return;
    if (!selectedBase || !selectedSuffix) return;
    const combined =
      (selectedBase.level ?? 0) +
      (selectedPrefix?.level ?? 0) +
      selectedSuffix.level;
    if (combined > wearableCap) {
      setSelectedSuffix(null);
    }
  }, [strictItemLevel, selectedBase, selectedPrefix, selectedSuffix, wearableCap]);

  const handleEquip = () => {
    if (!selectedBase) return;

    const equippedItem: EquippedItem = {
      baseItem: selectedBase,
      prefix: selectedPrefix || undefined,
      suffix: selectedSuffix || undefined,
      rarity: selectedRarity,
      conditioned,
      // Only save enchantValue for items that can have protective gear/grindstone (not rings/amulets)
      enchantValue: (selectedBase.type !== 'rings' && selectedBase.type !== 'amulets' && enchantValue > 0) ? enchantValue : undefined,
      upgrades: selectedUpgrades.length > 0 ? selectedUpgrades : undefined,
    };

    onSelect(equippedItem);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Select Item for {slotType}</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* Step 1: Select Base Item */}
          <div className={styles.section}>
            <h4>1. Choose Base Item</h4>
            
            <div className={styles.filters}>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <select
                value={levelFilter || ''}
                onChange={(e) => setLevelFilter(e.target.value ? Number(e.target.value) : null)}
                className={styles.levelFilter}
              >
                <option value="">All Levels</option>
                {Array.from(new Set(availableBaseItems.map(i => i.level)))
                  .sort((a, b) => (a || 0) - (b || 0))
                  .map(level => (
                    <option key={level} value={level || ''}>Level {level}</option>
                  ))}
              </select>
            </div>

            <div className={styles.itemList}>
              {filteredItems.map((item) => (
                <div
                  key={item.name}
                  className={`${styles.itemCard} ${selectedBase?.name === item.name ? styles.selected : ''}`}
                  onClick={() => setSelectedBase(item)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedBase(item)}
                  tabIndex={0}
                >
                  <div className={`item-i-${item.id} ${styles.itemImage}`} />
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemLevel}>Level {item.level}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Customize Item */}
          {selectedBase && (
            <div className={styles.section}>
              <h4>2. Customize Item</h4>
              
              <div className={styles.customization}>
                {/* Prefix Selection */}
                <div className={styles.customField}>
                  <label htmlFor="prefix-search">Prefix (Optional):</label>
                  <input
                    id="prefix-search"
                    type="text"
                    placeholder="Search prefixes..."
                    value={prefixSearch}
                    onChange={(e) => setPrefixSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                  {selectedPrefix && (
                    <div className={styles.selectedItem}>
                      Selected: {selectedPrefix.name} (Lvl {selectedPrefix.level})
                      <button
                        onClick={() => setSelectedPrefix(null)}
                        className={styles.clearSelection}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className={styles.dropdownList}>
                    {filteredPrefixes.map((prefix) => (
                      <div
                        key={prefix.name}
                        className={`${styles.dropdownItem} ${selectedPrefix?.name === prefix.name ? styles.selectedDropdownItem : ''}`}
                        onClick={() => {
                          setSelectedPrefix(prefix);
                          setPrefixSearch('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSelectedPrefix(prefix);
                            setPrefixSearch('');
                          }
                        }}
                        tabIndex={0}
                      >
                        {prefix.name} (Lvl {prefix.level})
                      </div>
                    ))}
                    {filteredPrefixes.length === 0 && (
                      <div className={styles.dropdownHint}>
                        No prefixes found
                      </div>
                    )}
                  </div>
                </div>

                {/* Suffix Selection */}
                <div className={styles.customField}>
                  <label htmlFor="suffix-search">Suffix (Optional):</label>
                  <input
                    id="suffix-search"
                    type="text"
                    placeholder="Search suffixes..."
                    value={suffixSearch}
                    onChange={(e) => setSuffixSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                  {selectedSuffix && (
                    <div className={styles.selectedItem}>
                      Selected: {selectedSuffix.name} (Lvl {selectedSuffix.level})
                      <button
                        onClick={() => setSelectedSuffix(null)}
                        className={styles.clearSelection}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className={styles.dropdownList}>
                    {filteredSuffixes.map((suffix) => (
                      <div
                        key={suffix.name}
                        className={`${styles.dropdownItem} ${selectedSuffix?.name === suffix.name ? styles.selectedDropdownItem : ''}`}
                        onClick={() => {
                          setSelectedSuffix(suffix);
                          setSuffixSearch('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSelectedSuffix(suffix);
                            setSuffixSearch('');
                          }
                        }}
                        tabIndex={0}
                      >
                        {suffix.name} (Lvl {suffix.level})
                      </div>
                    ))}
                    {filteredSuffixes.length === 0 && (
                      <div className={styles.dropdownHint}>
                        No suffixes found
                      </div>
                    )}
                  </div>
                </div>

                {/* Rarity Selection */}
                <div className={styles.customField}>
                  <label htmlFor="rarity-select">Rarity:</label>
                  <select
                    id="rarity-select"
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value as ItemRarity)}
                    className={styles.select}
                  >
                    <option value="common">Common</option>
                    <option value="green">Green (Ceres)</option>
                    <option value="blue">Blue (Neptune)</option>
                    <option value="purple">Purple (Mars)</option>
                    <option value="orange">Orange (Jupiter)</option>
                    <option value="red">Red (Olympus)</option>
                  </select>
                </div>

                {/* Conditioning */}
                <div className={styles.customField}>
                  <label htmlFor="conditioned-checkbox">
                    <input
                      id="conditioned-checkbox"
                      type="checkbox"
                      checked={conditioned}
                      onChange={(e) => setConditioned(e.target.checked)}
                    />
                    {' '}Conditioned (+)
                  </label>
                </div>

                {/* Enchant Value - only for weapons and armor pieces (not rings/amulets) */}
                {selectedBase && selectedBase.type !== 'amulets' && selectedBase.type !== 'rings' && (
                  <div className={styles.customField}>
                    <label htmlFor="enchant-input">
                      Enchant {selectedBase.type === 'weapons' ? '(Grindstone +Damage)' : '(Protective gear +Armor)'}:
                    </label>
                    <input
                      id="enchant-input"
                      type="number"
                      min="0"
                      max="999"
                      value={enchantValue}
                      onChange={(e) => setEnchantValue(Number(e.target.value))}
                      className={styles.numberInput}
                      placeholder="0"
                      disabled={selectedUpgrades.length > 0}
                      title={selectedUpgrades.length > 0 ? 'Cannot use enchant when powders are applied' : ''}
                    />
                  </div>
                )}

                {/* Upgrades (Powders, etc.) */}
                {availableUpgrades.length > 0 && (
                  <div className={styles.customField}>
                    <label>Upgrades (Powders):</label>
                    <div className={styles.upgradesList}>
                      {availableUpgrades.map((upgrade) => {
                        const existingUpgrade = selectedUpgrades.find(u => u.upgrade.name === upgrade.name);
                        const isSelected = !!existingUpgrade;
                        // Powders are only disabled by enchant for items that CAN have enchants (not rings/amulets)
                        const isPowderDisabled = selectedBase && selectedBase.type !== 'rings' && selectedBase.type !== 'amulets' && enchantValue > 0;
                        const statName = upgrade.stat.charAt(0).toUpperCase() + upgrade.stat.slice(1);
                        
                        return (
                          <div key={upgrade.name} className={styles.upgradeRow}>
                            <label className={styles.upgradeLabel}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isPowderDisabled}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUpgrades([...selectedUpgrades, { upgrade, level: 1 }]);
                                  } else {
                                    setSelectedUpgrades(selectedUpgrades.filter(u => u.upgrade.name !== upgrade.name));
                                  }
                                }}
                                title={isPowderDisabled ? 'Cannot use powders when enchant is applied' : ''}
                              />
                              {' '}{upgrade.name} ({statName})
                            </label>
                            {isSelected && (
                              <input
                                type="number"
                                min="1"
                                max="999"
                                value={existingUpgrade.level}
                                onChange={(e) => {
                                  const newLevel = Number(e.target.value);
                                  setSelectedUpgrades(
                                    selectedUpgrades.map(u => 
                                      u.upgrade.name === upgrade.name 
                                        ? { ...u, level: newLevel } 
                                        : u
                                    )
                                  );
                                }}
                                className={styles.upgradeLevel}
                                placeholder="Bonus"
                                title="Enter the stat bonus amount (e.g., 12 for +12)"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className={styles.preview}>
                <h5>Preview:</h5>
                <div className={styles.previewItem}>
                  <Item
                    baseItem={selectedBase}
                    prefix={selectedPrefix || undefined}
                    suffix={selectedSuffix || undefined}
                    rarity={selectedRarity}
                    conditioned={conditioned}
                    enchantValue={enchantValue > 0 ? enchantValue : undefined}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button 
            className={styles.equipButton} 
            onClick={handleEquip}
            disabled={!selectedBase}
          >
            Equip Item
          </button>
        </div>
      </div>
    </div>
  );
}
