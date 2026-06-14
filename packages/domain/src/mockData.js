export const ROSA_NETWORK = {
  id: "stellar_testnet",
  label: "Stellar Testnet",
  horizonUrl: "https://horizon-testnet.stellar.org"
};

export const mockData = {
  merchant: {
    id: "mer_01",
    name: "Ege",
    email: "ege@example.com",
    wallet: "GABC...XY123",
    network: ROSA_NETWORK.label
  },
  businesses: [
    { id: "bus_01", name: "Rosa Cafe", slug: "rosa-cafe", branches: 2, status: "ACTIVE", received: "940.25 XLM" },
    { id: "bus_02", name: "Golden Studio", slug: "golden-studio", branches: 1, status: "ACTIVE", received: "300.00 XLM" },
    { id: "bus_03", name: "Norm Pop-up Store", slug: "norm-popup", branches: 3, status: "DRAFT", received: "0.00 XLM" }
  ],
  branches: [
    { id: "br_01", businessId: "bus_01", business: "Rosa Cafe", name: "Alsancak Branch", wallet: "GABC...XY123", payments: 19, status: "ACTIVE" },
    { id: "br_02", businessId: "bus_01", business: "Rosa Cafe", name: "Bostanli Branch", wallet: "GDEF...LQ987", payments: 8, status: "ACTIVE" },
    { id: "br_03", businessId: "bus_02", business: "Golden Studio", name: "Online Checkout", wallet: "GHIJ...MN456", payments: 5, status: "ACTIVE" }
  ],
  payments: [
    { id: "pay_7f9s2k", businessId: "bus_01", branchId: "br_01", business: "Rosa Cafe", branch: "Alsancak Branch", amount: "10.00", asset: "XLM", status: "PENDING", created: "2m ago", memo: "pay_7f9s2k", destination: "GABC...XY123", expiresIn: "29:59", description: "Coffee payment" },
    { id: "pay_3h6d1a", businessId: "bus_01", branchId: "br_01", business: "Rosa Cafe", branch: "Alsancak Branch", amount: "25.00", asset: "XLM", status: "PAID", created: "15m ago", memo: "pay_3h6d1a", destination: "GABC...XY123", expiresIn: "00:00", description: "Table payment" },
    { id: "pay_9g2b7c", businessId: "bus_02", branchId: "br_03", business: "Golden Studio", branch: "Online Checkout", amount: "8.50", asset: "XLM", status: "PAID", created: "1h ago", memo: "pay_9g2b7c", destination: "GHIJ...MN456", expiresIn: "00:00", description: "Digital order" },
    { id: "pay_1a2b3c", businessId: "bus_01", branchId: "br_02", business: "Rosa Cafe", branch: "Bostanli Branch", amount: "15.00", asset: "XLM", status: "EXPIRED", created: "2h ago", memo: "pay_1a2b3c", destination: "GDEF...LQ987", expiresIn: "00:00", description: "Counter payment" },
    { id: "pay_8d7f6e", businessId: "bus_01", branchId: "br_01", business: "Rosa Cafe", branch: "Alsancak Branch", amount: "30.00", asset: "XLM", status: "PAID", created: "3h ago", memo: "pay_8d7f6e", destination: "GABC...XY123", expiresIn: "00:00", description: "Group payment" }
  ],
  transactions: [
    { hash: "0f9a...f3a", payment: "pay_3h6d1a", customer: "GQWE...K92A", amount: "25.00 XLM", status: "CONFIRMED", time: "15m ago" },
    { hash: "7b8c...1d2", payment: "pay_9g2b7c", customer: "GRTY...L81C", amount: "8.50 XLM", status: "CONFIRMED", time: "1h ago" },
    { hash: "32af...9ab", payment: "pay_1a2b3c", customer: "GJKL...P44D", amount: "15.00 XLM", status: "FAILED", time: "2h ago" },
    { hash: "11cd...7ee", payment: "pay_8d7f6e", customer: "GZXC...N77B", amount: "30.00 XLM", status: "CONFIRMED", time: "3h ago" }
  ],
  customers: [
    { wallet: "GQWE...K92A", payments: 3, volume: "48.00 XLM", firstSeen: "Today" },
    { wallet: "GRTY...L81C", payments: 1, volume: "8.50 XLM", firstSeen: "Today" },
    { wallet: "GZXC...N77B", payments: 4, volume: "92.00 XLM", firstSeen: "Yesterday" }
  ],
  auditEvents: [
    { event: "Wallet connected", entity: "Merchant", time: "Now" },
    { event: "Payment request created", entity: "pay_7f9s2k", time: "2m ago" },
    { event: "QR generated", entity: "pay_7f9s2k", time: "2m ago" },
    { event: "Duplicate transaction rejected", entity: "txn_32af", time: "2h ago" }
  ]
};

export function buildPaymentPayload(payment) {
  return {
    type: "rosa_payment_request",
    network: ROSA_NETWORK.id,
    paymentRequestId: payment.id,
    destination: payment.destination,
    amount: payment.amount,
    asset: payment.asset,
    memo: payment.memo
  };
}
