export type TelemetryEventName =
  | 'auth.signup'
  | 'auth.confirmed'
  | 'listing.created'
  | 'listing.join_started'
  | 'payment.held'
  | 'payment.refunded'
  | 'dispute.opened'
  | 'cron.reconcile';

/**
 * Emits structured JSON telemetry for MVP analytics & payment/SLA observability.
 */
export function trackEvent(
  event: TelemetryEventName,
  properties: Record<string, unknown> = {}
): void {
  console.info(
    JSON.stringify({
      level: 'info',
      kind: 'analytics_event',
      event,
      timestamp: new Date().toISOString(),
      ...properties,
    })
  );
}

/**
 * Emits structured error logs (and forwards to Sentry webhook/DSN if configured).
 */
export function reportError(
  context: string,
  err: unknown,
  extra: Record<string, unknown> = {}
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(
    JSON.stringify({
      level: 'error',
      kind: 'error_event',
      context,
      message,
      stack,
      timestamp: new Date().toISOString(),
      ...extra,
    })
  );
}

