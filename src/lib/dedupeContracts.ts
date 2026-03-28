export function dedupeContracts<T extends {
  id: string;
  offer_id?: string | null;
  offer_version?: number | null;
  track_title?: string | null;
  created_at?: string | null;
  status?: string | null;
  producer_signed_at?: string | null;
}>(contracts: T[]): T[] {
  const isSigned = (contract: T) =>
    Boolean(contract.producer_signed_at) ||
    contract.status === "fully_executed" ||
    contract.status === "signed_by_producer" ||
    contract.status === "signed_by_platform" ||
    contract.status === "archived";

  const getKey = (contract: T) =>
    contract.offer_id || `${contract.track_title ?? contract.id}-${contract.offer_version ?? "na"}`;

  const byKey = new Map<string, T>();

  for (const contract of contracts) {
    const key = getKey(contract);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, contract);
      continue;
    }

    const contractSigned = isSigned(contract);
    const existingSigned = isSigned(existing);

    if (contractSigned && !existingSigned) {
      byKey.set(key, contract);
      continue;
    }

    if (contractSigned === existingSigned) {
      const contractTime = contract.created_at ? new Date(contract.created_at).getTime() : 0;
      const existingTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;

      if (contractTime > existingTime) {
        byKey.set(key, contract);
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aSigned = isSigned(a) ? 1 : 0;
    const bSigned = isSigned(b) ? 1 : 0;
    if (aSigned !== bSigned) return bSigned - aSigned;

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}
