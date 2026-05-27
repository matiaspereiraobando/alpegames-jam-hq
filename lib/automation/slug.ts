import { getMaxJamNumber } from '../db.ts';

export interface DeriveJamFieldsInput {
  title: string;
  jam_number?: number | null;
  jam_slug?: string | null;
  getNextJamNumber?: () => number;
}

export interface DeriveJamFieldsResult {
  jam_number: number;
  jam_slug: string;
  normalized_title: string;
}

export function slugifyJamName(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'untitled-jam';
}

export function deriveJamFields(input: DeriveJamFieldsInput): DeriveJamFieldsResult {
  const title = input.title.trim();
  const explicitNumber = input.jam_number ?? undefined;
  const explicitSlug = input.jam_slug?.trim() || undefined;
  const match = title.match(/^\s*jam\s*#?(\d+)\s*[:-]?\s*(.*)$/i);
  const parsedNumber = match ? Number(match[1]) : undefined;
  const rawName = match ? match[2].trim() : title;
  const jam_number = explicitNumber ?? parsedNumber ?? resolveNextJamNumber(input.getNextJamNumber);
  const jam_slug = explicitSlug ? slugifyJamName(explicitSlug) : slugifyJamName(rawName);
  const normalized_title = `Jam #${jam_number} - ${rawName || jam_slug}`;

  return {
    jam_number,
    jam_slug,
    normalized_title,
  };
}

function resolveNextJamNumber(getNextJamNumber?: () => number): number {
  if (getNextJamNumber) {
    return getNextJamNumber();
  }

  return (getMaxJamNumber() ?? 0) + 1;
}
