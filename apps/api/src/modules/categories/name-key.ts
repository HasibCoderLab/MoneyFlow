/**
 * Case-insensitive uniqueness key for category names (domain-model.md
 * "Category"): the trimmed, lowercased `nameKey` is what the database's
 * `category_userId_nameKey_type_key` unique index constrains, so `Salary`
 * and `salary` cannot coexist within one type — and the same name may
 * exist once per type (`Other` income vs `Other` expense).
 *
 * Maintained by the service layer on every write, never by the client.
 */
export function toCategoryNameKey(name: string): string {
  return name.trim().toLowerCase();
}
