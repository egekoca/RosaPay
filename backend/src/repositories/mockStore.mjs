import { mockData } from "../../../packages/domain/src/mockData.js";

export function createMockStore() {
  const state = structuredClone(mockData);
  const idempotencyRecords = new Map();

  return {
    getState() {
      return state;
    },

    listBusinesses() {
      return state.businesses;
    },

    listBranches() {
      return state.branches;
    },

    addBusiness(business) {
      state.businesses.unshift(business);
      return business;
    },

    addBranch(branch) {
      state.branches.unshift(branch);
      const business = state.businesses.find((item) => item.id === branch.businessId);
      if (business) business.branches += 1;
      return branch;
    },

    listPayments() {
      return state.payments;
    },

    findPaymentById(id) {
      return state.payments.find((payment) => payment.id === id);
    },

    findTransactionByHash(hash) {
      return state.transactions.find((transaction) => transaction.hash === hash);
    },

    findTransactionByPaymentId(paymentId) {
      return state.transactions.find((transaction) => transaction.payment === paymentId);
    },

    findIdempotencyRecord(key) {
      return idempotencyRecords.get(key);
    },

    saveIdempotencyRecord(key, record) {
      idempotencyRecords.set(key, record);
      return record;
    },

    addPayment(payment) {
      state.payments.unshift(payment);
      return payment;
    },

    updatePaymentStatus(id, status) {
      const payment = this.findPaymentById(id);
      if (payment) payment.status = status;
      return payment;
    },

    addTransaction(transaction) {
      state.transactions.unshift(transaction);
      return transaction;
    },

    addAuditEvent(event) {
      state.auditEvents.unshift(event);
      return event;
    }
  };
}
