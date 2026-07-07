import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditAction,
  type AuditEntityType,
} from "../../../domain/entities/audit-event.entity";
import type { AuditLogFilter } from "../../../domain/entities/audit-log-filter.entity";

const ENTITY_SET = new Set<string>(AUDIT_ENTITY_TYPES);
const ACTION_SET = new Set<string>(AUDIT_ACTIONS);

/**
 * Parse an applied {@link AuditLogFilter} from URL search params (US-E12.12).
 * Unknown/empty values are dropped so the filter (and its query key) is stable —
 * `{}` and an all-empty query string hash identically.
 */
export function parseFilterFromParams(params: URLSearchParams): AuditLogFilter {
  const filter: AuditLogFilter = {};

  const entityType = params.get("entityType");
  if (entityType && ENTITY_SET.has(entityType)) {
    filter.entityType = entityType as AuditEntityType;
  }

  const action = params.get("action");
  if (action && ACTION_SET.has(action)) {
    filter.action = action as AuditAction;
  }

  const actor = params.get("actor")?.trim();
  if (actor) filter.actorQuery = actor;

  const from = params.get("from");
  if (from) filter.from = from;

  const to = params.get("to");
  if (to) filter.to = to;

  return filter;
}

/** Serialize a filter to a query string (omitting empty values). */
export function filterToQueryString(filter: AuditLogFilter): string {
  const params = new URLSearchParams();
  if (filter.entityType) params.set("entityType", filter.entityType);
  if (filter.action) params.set("action", filter.action);
  if (filter.actorQuery?.trim()) params.set("actor", filter.actorQuery.trim());
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  return params.toString();
}

/** Structural equality of two filters (order-independent, empty-normalized). */
export function filtersEqual(a: AuditLogFilter, b: AuditLogFilter): boolean {
  return filterToQueryString(a) === filterToQueryString(b);
}
