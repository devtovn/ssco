/**
 * Derive in-stock status from Tiki public web API payloads.
 * Search/list responses use `availability: 1`; detail pages use `inventory_status`.
 */
export function resolveTikiAvailability(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const row = data as Record<string, unknown>;
  const status = String(row.inventory_status ?? '').toLowerCase();

  if (status === 'out_of_stock' || status === 'discontinued') return false;
  if (status === 'available' || status === 'instock' || status === 'in_stock') return true;

  const stockItem = row.stock_item as { qty?: number } | undefined;
  const inventory = row.inventory as
    | { quantity_sellable?: number; quantity_available?: number; inventory_type?: string }
    | undefined;

  const qty =
    stockItem?.qty ?? inventory?.quantity_sellable ?? inventory?.quantity_available;
  if (typeof qty === 'number') return qty > 0;

  if (row.availability === 1 || row.availability === true) return true;
  if (row.availability === 0 || row.availability === false) return false;

  if (String(row.inventory_type ?? inventory?.inventory_type ?? '').toLowerCase() === 'instock') {
    return true;
  }

  const price = parseFloat(String(row.price ?? row.list_price ?? 0));
  return price > 0;
}
