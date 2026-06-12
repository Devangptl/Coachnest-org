/**
 * Element reconciliation — mirrors Excalidraw's own conflict resolution.
 *
 * Two clients editing the same element produce diverging copies; we converge
 * them deterministically with last-write-wins by `version`, breaking ties with
 * the larger `versionNonce` (Excalidraw assigns a random nonce on every edit so
 * this is stable and symmetric across peers). Pure — used on client and server.
 */
import type { SyncableElement } from "@/types/whiteboard";

function shouldReplace(local: SyncableElement, remote: SyncableElement): boolean {
  if (remote.version > local.version) return true;
  if (remote.version < local.version) return false;
  // Same version → break the tie by versionNonce (larger wins).
  return (remote.versionNonce ?? 0) >= (local.versionNonce ?? 0);
}

/**
 * Merge `remote` elements into `local`, returning a new ordered array.
 * Elements present only remotely are appended; deleted elements are kept
 * (flagged `isDeleted`) so the deletion propagates and persists.
 */
export function reconcileElements(
  local: SyncableElement[],
  remote: SyncableElement[],
): SyncableElement[] {
  const byId = new Map<string, SyncableElement>();
  for (const el of local) byId.set(el.id, el);

  for (const el of remote) {
    const existing = byId.get(el.id);
    if (!existing || shouldReplace(existing, el)) {
      byId.set(el.id, el);
    }
  }

  return Array.from(byId.values());
}

/**
 * Given the previously-synced version map and the current scene, return only
 * the elements that changed (new, edited, or newly deleted). Enables
 * incremental persistence and broadcast instead of shipping the whole scene.
 */
export function diffElements(
  current: SyncableElement[],
  lastVersions: Map<string, number>,
): SyncableElement[] {
  const changed: SyncableElement[] = [];
  for (const el of current) {
    const prev = lastVersions.get(el.id);
    if (prev === undefined || el.version > prev) changed.push(el);
  }
  return changed;
}
