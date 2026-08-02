/**
 * Query key for the parent's children overview (US-E20.4). Deliberately
 * disjoint from `PARENT_CONSENT_QUERY_KEY` (`["parent-consent"]`): the two
 * screens project the same use-case into different VMs, so sharing a key would
 * make one screen's cached shape leak into the other.
 */
export const CHILDREN_OVERVIEW_QUERY_KEY = ["children-overview"] as const;
