#!/usr/bin/env node
/**
 * Generates an HTML table of "new" prefixes and suffixes for forum posts.
 * Usage:
 *   node generate-new-affixes-table.js            (both)
 *   node generate-new-affixes-table.js prefixes   (prefixes only)
 *   node generate-new-affixes-table.js suffixes   (suffixes only)
 *
 * Output is written to new-affixes-table.html in the current directory.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'static', 'data', 'items');

function formatGold(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatStats(stats) {
  const parts = [];
  for (const [key, values] of Object.entries(stats)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (values.flat !== 0) {
      const sign = values.flat > 0 ? '+' : '';
      parts.push(`${label} ${sign}${values.flat}`);
    }
    if (values.percent !== 0) {
      const sign = values.percent > 0 ? '+' : '';
      parts.push(`${label} ${sign}${values.percent}%`);
    }
  }
  return parts.join('<br>');
}

function buildTable(items, label) {
  if (items.length === 0) {
    return `<p>No new ${label} found.</p>`;
  }

  const rows = items.map(item => {
    const statsHtml = formatStats(item.stats);
    return `  <tr>
    <td>${item.name}</td>
    <td>${item.level}</td>
    <td>${statsHtml}</td>
    <td>${formatGold(item.gold)}</td>
  </tr>`;
  }).join('\n');

  return `<h3>${label} (${items.length} new)</h3>
<table border="1" cellpadding="6" cellspacing="0">
  <thead>
    <tr>
      <th>Name</th>
      <th>Level</th>
      <th>Stats</th>
      <th>Gold Value</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

const mode = process.argv[2] || 'both';
const sections = [];

if (mode === 'prefixes' || mode === 'both') {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'prefixes.json'), 'utf8'));
  const newItems = raw.filter(item => item.new === true);
  console.log(`Found ${newItems.length} new prefix(es).`);
  sections.push(buildTable(newItems, 'New Prefixes'));
}

if (mode === 'suffixes' || mode === 'both') {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'suffixes.json'), 'utf8'));
  const newItems = raw.filter(item => item.new === true);
  console.log(`Found ${newItems.length} new suffix(es).`);
  sections.push(buildTable(newItems, 'New Suffixes'));
}

const html = sections.join('\n\n');
const outPath = path.join(__dirname, 'new-affixes-table.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`\nOutput written to: ${outPath}`);
