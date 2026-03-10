import React, { useState, useMemo } from 'react';
import Item, { BaseItem, PrefixSuffix, ItemRarity } from './Item';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

type ItemType =
  | 'weapons'
  | 'shields'
  | 'armour'
  | 'helmets'
  | 'gloves'
  | 'shoes'
  | 'rings'
  | 'amulets';

const SLOT_LABELS: Record<ItemType, string> = {
  weapons: 'Weapons',
  shields: 'Shields',
  armour: 'Armour',
  helmets: 'Helmets',
  gloves: 'Gloves',
  shoes: 'Shoes',
  rings: 'Rings',
  amulets: 'Amulets',
};

const SLOTS: ItemType[] = [
  'weapons', 'shields', 'armour', 'helmets',
  'gloves', 'shoes', 'rings', 'amulets',
];

const RARITIES: { value: ItemRarity; label: string }[] = [
  { value: 'common', label: 'Common (white)' },
  { value: 'green',  label: 'Green (Ceres)' },
  { value: 'blue',   label: 'Blue (Neptune)' },
  { value: 'purple', label: 'Purple (Mars)' },
  { value: 'orange', label: 'Orange (Jupiter)' },
  { value: 'red',    label: 'Red (Olympus)' },
];

// Stat sort / filter options — value is "statKey:type" or "level"
const STAT_OPTIONS: { value: string; label: string }[] = [
  { value: 'level',                label: 'Level' },
  { value: 'damage:flat',          label: 'Damage' },
  { value: 'armour:flat',          label: 'Armour' },
  { value: 'health:flat',          label: 'Health' },
  { value: 'strength:flat',        label: 'Strength' },
  { value: 'strength:percent',     label: 'Strength %' },
  { value: 'dexterity:flat',       label: 'Dexterity' },
  { value: 'dexterity:percent',    label: 'Dexterity %' },
  { value: 'agility:flat',         label: 'Agility' },
  { value: 'agility:percent',      label: 'Agility %' },
  { value: 'constitution:flat',    label: 'Constitution' },
  { value: 'constitution:percent', label: 'Constitution %' },
  { value: 'charisma:flat',        label: 'Charisma' },
  { value: 'charisma:percent',     label: 'Charisma %' },
  { value: 'intelligence:flat',    label: 'Intelligence' },
  { value: 'intelligence:percent', label: 'Intelligence %' },
  { value: 'critical_hit:flat',    label: 'Critical Hit' },
  { value: 'critical_hit:percent', label: 'Critical Hit %' },
  { value: 'double_hit:flat',      label: 'Double Hit' },
  { value: 'double_hit:percent',   label: 'Double Hit %' },
  { value: 'block_chance:flat',    label: 'Block Chance' },
  { value: 'block_chance:percent', label: 'Block Chance %' },
  { value: 'healing:flat',         label: 'Healing' },
  { value: 'healing:percent',      label: 'Healing %' },
];

const ITEMS_PER_PAGE = 60;

const inputStyle: React.CSSProperties = {
  padding: '8px',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: '4px',
  backgroundColor: 'var(--ifm-background-color)',
  color: 'var(--ifm-font-color-base)',
};

// ─── Searchable dropdown ───────────────────────────────────────────────────

interface SearchableSelectProps {
  id: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  anyLabel?: string;
}

function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  label,
  anyLabel = 'Any',
}: Readonly<SearchableSelectProps>) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const allOptions = useMemo(
    () => [{ value: '', label: anyLabel }, ...options],
    [options, anyLabel],
  );

  const filtered = useMemo(
    () =>
      allOptions.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [allOptions, search],
  );

  const selectedLabel = allOptions.find((o) => o.value === value)?.label ?? anyLabel;

  return (
    <div style={{ position: 'relative', minWidth: '200px' }}>
      <label
        htmlFor={id}
        style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={open ? search : ''}
        placeholder={selectedLabel}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1000,
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--ifm-background-color)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '8px', color: 'var(--ifm-color-emphasis-500)' }}>
              No results
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={() => { onChange(o.value); setSearch(''); setOpen(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background: o.value === value ? 'var(--ifm-color-emphasis-200)' : 'transparent',
                  fontSize: '13px',
                  border: 'none',
                  color: 'var(--ifm-font-color-base)',
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Combination type ──────────────────────────────────────────────────────

interface ItemCombo {
  base: BaseItem;
  prefix: PrefixSuffix | undefined;
  suffix: PrefixSuffix | undefined;
  finalLevel: number;
  key: string;
}

// Extracted to reduce cognitive complexity of the useMemo callback
function buildCombos(
  bases: BaseItem[],
  prefixList: (PrefixSuffix | undefined)[],
  suffixList: (PrefixSuffix | undefined)[],
  minLevel: number,
  maxLevel: number,
): ItemCombo[] {
  const result: ItemCombo[] = [];
  for (const base of bases) {
    for (const prefix of prefixList) {
      for (const suffix of suffixList) {
        const finalLevel =
          (base.level ?? 0) + (prefix?.level ?? 0) + (suffix?.level ?? 0);
        if (finalLevel >= minLevel && finalLevel <= maxLevel) {
          result.push({
            base,
            prefix,
            suffix,
            finalLevel,
            key: `${base.id ?? base.name}-${prefix?.name ?? 'none'}-${suffix?.name ?? 'none'}`,
          });
        }
      }
    }
  }
  result.sort((a, b) => a.finalLevel - b.finalLevel);
  return result;
}

// Returns the combined prefix+suffix value for a stat key ("stat:flat" or "stat:percent")
function getComboStat(combo: ItemCombo, statKey: string): number {
  const colonIdx = statKey.indexOf(':');
  if (colonIdx === -1) return 0;
  const stat = statKey.slice(0, colonIdx);
  const type = statKey.slice(colonIdx + 1) as 'flat' | 'percent';
  return (combo.prefix?.stats?.[stat]?.[type] ?? 0) +
         (combo.suffix?.stats?.[stat]?.[type] ?? 0);
}

// Formats a stat value for display on the item card
function formatStatValue(statKey: string, value: number): string {
  const isPercent = statKey.endsWith(':percent');
  const sign = value > 0 ? '+' : '';
  return isPercent ? `${sign}${value}%` : `${sign}${value}`;
}

// Builds a flat list of page indices interspersed with gap markers
type PageItem = number | `gap-${number}-${number}`;

function buildPageItems(totalPages: number, currentPage: number): PageItem[] {
  const indices = Array.from({ length: totalPages }, (_, i) => i).filter(
    (i) => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2,
  );

  const result: PageItem[] = [];
  indices.forEach((i, idx) => {
    const prev = indices[idx - 1];
    if (idx > 0 && prev !== undefined && i - prev > 1) {
      result.push(`gap-${prev}-${i}`);
    }
    result.push(i);
  });
  return result;
}

// ─── Main component ────────────────────────────────────────────────────────

export default function ItemLevelChecker() {
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [selectedSlot, setSelectedSlot]     = useState<ItemType>('weapons');
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity>('green');
  const [selectedPrefix, setSelectedPrefix] = useState<string>('');
  const [selectedSuffix, setSelectedSuffix] = useState<string>('');
  const [nameFilter, setNameFilter]         = useState<string>('');
  const [sortBy, setSortBy]                 = useState<string>('level');
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('asc');
  const [filterStat, setFilterStat]         = useState<string>('');
  const [page, setPage] = useState(0);

  const maxLevel = characterLevel + 16;
  const resetPage = () => setPage(0);

  const bases = useMemo(
    () => (basesData as BaseItem[]).filter((b) => b.type === selectedSlot),
    [selectedSlot],
  );

  const prefixOptions = useMemo(
    () =>
      (prefixesData as PrefixSuffix[]).map((p) => ({
        value: p.name,
        label: `${p.name} (lv.${p.level})`,
      })),
    [],
  );

  const suffixOptions = useMemo(
    () =>
      (suffixesData as (PrefixSuffix & { id?: number })[])
        .filter((s) => !(s.id !== undefined && s.id >= 100 && s.id <= 108))
        .map((s) => ({ value: s.name, label: `${s.name} (lv.${s.level})` })),
    [],
  );

  const resolvedPrefix = useMemo(
    () =>
      selectedPrefix
        ? (prefixesData as PrefixSuffix[]).find((p) => p.name === selectedPrefix)
        : undefined,
    [selectedPrefix],
  );

  const resolvedSuffix = useMemo(
    () =>
      selectedSuffix
        ? (suffixesData as PrefixSuffix[]).find((s) => s.name === selectedSuffix)
        : undefined,
    [selectedSuffix],
  );

  const allCombos = useMemo<ItemCombo[]>(() => {
    const prefixList: (PrefixSuffix | undefined)[] = resolvedPrefix
      ? [resolvedPrefix]
      : [undefined, ...(prefixesData as PrefixSuffix[])];

    const suffixList: (PrefixSuffix | undefined)[] = resolvedSuffix
      ? [resolvedSuffix]
      : [undefined, ...(suffixesData as PrefixSuffix[])];

    return buildCombos(bases, prefixList, suffixList, characterLevel, maxLevel);
  }, [bases, resolvedPrefix, resolvedSuffix, characterLevel, maxLevel]);

  const processedCombos = useMemo(() => {
    // 1. Name filter
    const nameQ = nameFilter.trim().toLowerCase();
    let result: ItemCombo[] = nameQ
      ? allCombos.filter((c) =>
          [c.prefix?.name, c.base.name, c.suffix?.name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(nameQ),
        )
      : allCombos;

    // 2. Stat filter — only keep items that have a non-zero value for the chosen stat
    if (filterStat) {
      result = result.filter((c) => getComboStat(c, filterStat) !== 0);
    }

    // 3. Sort
    if (sortBy === 'level') {
      // allCombos is already sorted ascending by level; reverse if needed
      if (sortDir === 'desc') {
        result = [...result].reverse();
      }
    } else {
      result = [...result].sort((a, b) => {
        const diff = getComboStat(b, sortBy) - getComboStat(a, sortBy);
        return sortDir === 'asc' ? -diff : diff;
      });
    }

    return result;
  }, [allCombos, nameFilter, filterStat, sortBy, sortDir]);

  const totalPages    = Math.ceil(processedCombos.length / ITEMS_PER_PAGE);
  const visibleCombos = processedCombos.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const pageItems     = buildPageItems(totalPages, page);

  const activeSortLabel = STAT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Level';

  return (
    <div>
      {/* ── Row 1: core filters ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '12px',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label
            htmlFor="ilc-level"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Character Level
          </label>
          <input
            id="ilc-level"
            type="number"
            min={1}
            max={300}
            value={characterLevel}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              setCharacterLevel(Number.isNaN(v) ? 1 : Math.max(1, v));
              resetPage();
            }}
            style={{ ...inputStyle, width: '100px' }}
          />
        </div>

        <div>
          <label
            htmlFor="ilc-slot"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Item Slot
          </label>
          <select
            id="ilc-slot"
            value={selectedSlot}
            onChange={(e) => { setSelectedSlot(e.target.value as ItemType); resetPage(); }}
            style={inputStyle}
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>{SLOT_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ilc-rarity"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Rarity
          </label>
          <select
            id="ilc-rarity"
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value as ItemRarity)}
            style={inputStyle}
          >
            {RARITIES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '220px' }}>
          <SearchableSelect
            id="ilc-prefix"
            label="Prefix"
            options={prefixOptions}
            value={selectedPrefix}
            onChange={(v) => { setSelectedPrefix(v); resetPage(); }}
            placeholder="Search prefix…"
            anyLabel="Any prefix"
          />
        </div>

        <div style={{ minWidth: '220px' }}>
          <SearchableSelect
            id="ilc-suffix"
            label="Suffix"
            options={suffixOptions}
            value={selectedSuffix}
            onChange={(v) => { setSelectedSuffix(v); resetPage(); }}
            placeholder="Search suffix…"
            anyLabel="Any suffix"
          />
        </div>

        <div>
          <label
            htmlFor="ilc-search"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Search by name
          </label>
          <input
            id="ilc-search"
            type="text"
            value={nameFilter}
            placeholder="e.g. Club, Ares, Wisdom…"
            onChange={(e) => { setNameFilter(e.target.value); resetPage(); }}
            style={{ ...inputStyle, minWidth: '180px' }}
          />
        </div>
      </div>

      {/* ── Row 2: stat filter + sort ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label
            htmlFor="ilc-filter-stat"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Must have stat
          </label>
          <select
            id="ilc-filter-stat"
            value={filterStat}
            onChange={(e) => { setFilterStat(e.target.value); resetPage(); }}
            style={inputStyle}
          >
            <option value="">Any stat</option>
            {STAT_OPTIONS.filter((o) => o.value !== 'level').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ilc-sort"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Sort by
          </label>
          <select
            id="ilc-sort"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); resetPage(); }}
            style={inputStyle}
          >
            {STAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ilc-sort-dir"
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
          >
            Order
          </label>
          <button
            id="ilc-sort-dir"
            type="button"
            onClick={() => { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); resetPage(); }}
            style={{ ...inputStyle, cursor: 'pointer', minWidth: '90px' }}
          >
            {sortDir === 'asc' ? `${activeSortLabel} ↑` : `${activeSortLabel} ↓`}
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <p style={{ color: 'var(--ifm-color-emphasis-700)', marginBottom: '16px' }}>
        <strong>{processedCombos.length.toLocaleString()}</strong>
        {allCombos.length !== processedCombos.length && (
          <> of {allCombos.length.toLocaleString()}</>
        )}{' '}
        combination{processedCombos.length === 1 ? '' : 's'} for level{' '}
        <strong>{characterLevel}</strong> (levels <strong>{characterLevel}–{maxLevel}</strong>)
        {selectedPrefix && <> · prefix <strong>{selectedPrefix}</strong></>}
        {selectedSuffix && <> · suffix <strong>{selectedSuffix}</strong></>}
        {nameFilter && <> · name contains <strong>&ldquo;{nameFilter}&rdquo;</strong></>}
        {filterStat && <> · has <strong>{STAT_OPTIONS.find((o) => o.value === filterStat)?.label}</strong></>}
        {totalPages > 1 && (
          <> · page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></>
        )}
      </p>

      {/* ── Items grid ── */}
      {processedCombos.length === 0 ? (
        <p style={{ color: 'var(--ifm-color-emphasis-500)' }}>
          No items found for this configuration.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {visibleCombos.map((combo) => {
            const fullName = [combo.prefix?.name, combo.base.name, combo.suffix?.name]
              .filter(Boolean)
              .join(' ');

            const statValue = sortBy === 'level' ? 0 : getComboStat(combo, sortBy);

            return (
              <div key={combo.key} style={{ textAlign: 'center', width: '64px' }}>
                <Item
                  baseItem={combo.base}
                  prefix={combo.prefix}
                  suffix={combo.suffix}
                  rarity={combo.prefix ?? combo.suffix ? selectedRarity : 'common'}
                  characterLevel={characterLevel}
                />
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--ifm-font-color-base)',
                    marginTop: '4px',
                    lineHeight: '1.3',
                    wordBreak: 'break-word',
                  }}
                >
                  {fullName}
                </div>
                <div style={{ fontSize: '10px', color: '#9b9b9b' }}>
                  Lv.{combo.finalLevel}
                </div>
                {sortBy !== 'level' && statValue !== 0 && (
                  <div style={{ fontSize: '10px', color: '#1eff00', fontWeight: 'bold' }}>
                    {formatStatValue(sortBy, statValue)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setPage(0)}
            disabled={page === 0}
            style={{ ...inputStyle, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
          >
            «
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ ...inputStyle, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
          >
            ‹
          </button>

          {pageItems.map((item) =>
            typeof item === 'string' ? (
              <span
                key={item}
                style={{ padding: '8px 4px', color: 'var(--ifm-color-emphasis-500)' }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  fontWeight: item === page ? 'bold' : 'normal',
                  background:
                    item === page
                      ? 'var(--ifm-color-emphasis-300)'
                      : 'var(--ifm-background-color)',
                }}
              >
                {item + 1}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{ ...inputStyle, cursor: page === totalPages - 1 ? 'default' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1 }}
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages - 1)}
            disabled={page === totalPages - 1}
            style={{ ...inputStyle, cursor: page === totalPages - 1 ? 'default' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1 }}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
