export function createAuditService({ store }) {
  return {
    record(event, entity) {
      return store.addAuditEvent({
        event,
        entity,
        time: "Now"
      });
    },

    listForEntity(entity) {
      return store.getState().auditEvents.filter((event) => event.entity === entity);
    }
  };
}
