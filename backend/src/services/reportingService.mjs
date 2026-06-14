export function createReportingService({ store }) {
  return {
    getOverview() {
      const state = store.getState();

      return {
        merchant: state.merchant,
        stats: [
          { label: "Total Received", value: "1,240.25", unit: "XLM", sub: "approx $184.34 USD" },
          { label: "Successful Payments", value: "32", unit: "", sub: "+12 this week" },
          { label: "Pending Payments", value: String(state.payments.filter((payment) => payment.status === "PENDING").length), unit: "", sub: "awaiting wallet approval" },
          { label: "Failed Payments", value: "2", unit: "", sub: "requires review" }
        ],
        recentPayments: state.payments.slice(0, 5),
        recentTransactions: state.transactions.slice(0, 5)
      };
    }
  };
}
