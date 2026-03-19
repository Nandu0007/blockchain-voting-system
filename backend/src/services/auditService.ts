import { randomUUID } from 'crypto';
import type { AuditEvent } from '../types/models';

class AuditService {
  private readonly events: AuditEvent[] = [];

  log(
    action: string,
    actor: string,
    targetType: AuditEvent['targetType'],
    targetId: string,
    metadata: Record<string, unknown> = {},
  ): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      action,
      actor,
      targetType,
      targetId,
      metadata,
      timestamp: new Date().toISOString(),
    };

    this.events.unshift(event);
    return event;
  }

  listByTarget(targetType: AuditEvent['targetType'], targetId?: string): AuditEvent[] {
    return this.events.filter((event) => {
      if (event.targetType !== targetType) {
        return false;
      }
      return targetId ? event.targetId === targetId : true;
    });
  }

  listRecent(limit = 100): AuditEvent[] {
    return this.events.slice(0, limit);
  }
}

export const auditService = new AuditService();
