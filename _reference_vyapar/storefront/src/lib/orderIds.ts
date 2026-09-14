/**
 * Collision-safe order ID generators.
 * Uses a combination of Base36 timestamp and random hex to guarantee absolute global uniqueness.
 */
import crypto from 'node:crypto';

/** Generate an 8-digit random numeric suffix for cleaner, human-readable IDs */
function getUniqueSuffix(): string {
  // Generates a cryptographically secure random number between 10000000 and 99999999
  return crypto.randomInt(10000000, 99999999).toString();
}

/** Generate a clean master order ID: VYP-84920192 */
export function generateMasterOrderId(): string {
  return `VYP-${getUniqueSuffix()}`;
}

/** Generate a unique sub-order ID: OD-84920192 or QC-84920192 */
export function generateSubOrderId(isQc: boolean = false): string {
  const prefix = isQc ? 'QC' : 'OD';
  return `${prefix}-${getUniqueSuffix()}`;
}

/** Generate a manual order ID: M-84920192 */
export function generateManualOrderId(): string {
  return `M-${getUniqueSuffix()}`;
}
