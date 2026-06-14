import { api } from "./services/api.js";

const app = document.getElementById("app");

const merchantScreens = [
  ["overview", "Overview", "◈"],
  ["businesses", "Businesses", "▣"],
  ["branches", "Branches", "⌂"],
  ["payments", "Payment Requests", "▤"],
  ["create-payment", "Create Payment", "+"],
  ["payment-detail", "Payment Detail", "QR"],
  ["transactions", "Transactions", "↔"],
  ["customers", "Customers", "☻"],
  ["live-test", "Live Test Setup", "◎"],
  ["security", "Security", "⌾"],
  ["settings", "Settings", "⚙"]
];

const customerScreens = [
  ["customer-qr", "1. QR Scan", "▦"],
  ["customer-checkout", "2. Checkout", "◎"],
  ["customer-wallet", "3. Wallet Selection", "◐"],
  ["customer-review", "4. Review Payment", "✓"],
  ["customer-success", "5. Success", "✓"]
];

let state = null;
let selectedPaymentId = "pay_7f9s2k";
let flashMessage = "";
let flashKind = "danger";
let checkoutDetail = null;
let paymentDetail = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badge(status) {
  const normalized = String(status).toLowerCase();
  const className = normalized.includes("paid") || normalized.includes("confirmed") || normalized.includes("active")
    ? "badge-paid"
    : normalized.includes("pending") || normalized.includes("testnet")
      ? "badge-pending"
      : "badge-failed";
  return `<span class="badge ${className}">${escapeHtml(status)}</span>`;
}

function pageTop(title, subtitle, actions = "") {
  return `
    <div class="topbar">
      <div class="page-title">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="top-actions">
        <span class="pill"><span class="dot"></span>${escapeHtml(state.network.label)}</span>
        <span class="pill">${escapeHtml(state.merchant.wallet)}</span>
        ${actions}
      </div>
    </div>
    ${flashMessage ? `<div class="alert alert-${escapeHtml(flashKind)}">${escapeHtml(flashMessage)}</div>` : ""}
  `;
}

function showError(error) {
  flashMessage = error.message || error.code || "REQUEST_FAILED";
  flashKind = "danger";
}

function clearError() {
  flashMessage = "";
  flashKind = "danger";
}

function getFreighterApi() {
  if (!window.freighterApi) {
    throw new Error("Freighter wallet is required for real Stellar payments.");
  }

  return window.freighterApi;
}

async function readFreighterBoolean(result, key) {
  if (typeof result === "boolean") return result;
  if (result?.error) throw new Error(result.error.message || result.error);
  return Boolean(result?.[key]);
}

async function payWithFreighter(payment) {
  const freighter = getFreighterApi();
  const connected = await readFreighterBoolean(await freighter.isConnected(), "isConnected");
  if (!connected) throw new Error("Freighter is not connected.");

  const access = await freighter.requestAccess();
  if (access?.error) throw new Error(access.error.message || access.error);
  const address = access.address;
  if (!address) throw new Error("Freighter did not return a public key.");

  const network = await freighter.getNetwork();
  if (network?.error) throw new Error(network.error.message || network.error);
  if (network.network && network.network !== "TESTNET") {
    throw new Error("Switch Freighter to TESTNET before paying.");
  }

  const build = await api.buildPaymentTransaction(payment.id, { source: address });
  const signed = await freighter.signTransaction(build.transaction.unsignedXdr, {
    network: "TESTNET",
    networkPassphrase: build.transaction.networkPassphrase,
    address
  });

  if (signed?.error) throw new Error(signed.error.message || signed.error);
  const signedXdr = signed.signedTxXdr || signed;

  return api.submitSignedTransaction(payment.id, {
    signedXdr,
    customer: address
  });
}

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function qr() {
  const on = new Set([0, 1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 22, 25, 26, 28, 30, 31, 33, 35, 36, 38, 39, 42, 43, 46, 48, 50, 51, 52, 54, 56, 58, 59, 61, 62, 65, 66, 68, 70, 72, 74, 76, 78, 79, 82, 85, 86, 87, 90, 91, 92, 94, 96, 98, 100, 101, 103, 105, 108, 110, 111, 112, 114, 116, 119, 120, 122, 124, 126, 127, 128, 130, 132, 133, 134, 137, 140, 142, 144, 145, 147, 148, 150, 153, 154, 155, 156, 164, 165, 166, 167, 168]);
  return `<div class="qr-box"><div class="qr-grid">${Array.from({ length: 169 }, (_, i) => `<div class="qr-cell ${on.has(i) ? "on" : ""}"></div>`).join("")}</div><div class="qr-logo">R</div></div>`;
}

function getPayment() {
  return paymentDetail?.payment || state.payments.find((payment) => payment.id === selectedPaymentId) || state.payments[0];
}

function getCheckoutPayment() {
  return checkoutDetail?.payment || getPayment();
}

function getCheckoutTransaction() {
  return checkoutDetail?.transaction || paymentDetail?.transaction || state.transactions.find((transaction) => transaction.payment === selectedPaymentId) || null;
}

function paymentStatusTone(status) {
  if (status === "PAID") return "status-paid";
  if (status === "EXPIRED") return "status-expired";
  return "status-pending";
}

function renderOverview() {
  return `
    ${pageTop("Overview", `Welcome back, ${state.merchant.name}.`, `<button class="btn btn-primary" data-screen="create-payment">Create Payment</button>`)}
    <div class="grid stats-grid">
      ${state.overview.stats.map((item) => `
        <div class="card stat">
          <div class="label">${escapeHtml(item.label)}</div>
          <div class="value">${escapeHtml(item.value)} <span>${escapeHtml(item.unit)}</span></div>
          <div class="sub">${escapeHtml(item.sub)}</div>
          <div class="spark"></div>
        </div>
      `).join("")}
    </div>
    <div class="grid two-col gap-top">
      <div class="card">
        <div class="card-header"><h3>Recent Payment Requests</h3><button class="btn" data-screen="payments">View all</button></div>
        ${table(["Payment", "Amount", "Status", "Created"], state.overview.recentPayments.map((p) => `<tr><td><strong>${escapeHtml(p.id)}</strong></td><td>${escapeHtml(p.amount)} ${escapeHtml(p.asset)}</td><td>${badge(p.status)}</td><td>${escapeHtml(p.created)}</td></tr>`).join(""))}
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Transactions</h3><button class="btn" data-screen="transactions">View all</button></div>
        ${table(["TXN", "Amount", "Status", "Time"], state.overview.recentTransactions.map((t) => `<tr><td><strong>${escapeHtml(t.hash)}</strong></td><td>${escapeHtml(t.amount)}</td><td>${badge(t.status)}</td><td>${escapeHtml(t.time)}</td></tr>`).join(""))}
      </div>
    </div>
  `;
}

function renderBusinesses() {
  return `
    ${pageTop("Businesses", "Manage multiple businesses under your Rosa Pay account.")}
    <div class="grid two-col">
      <div class="grid">
        ${state.businesses.map((business) => `
          <div class="card">
            <div class="card-header"><div><h3>${escapeHtml(business.name)}</h3><p>${escapeHtml(business.slug)}</p></div>${badge(business.status)}</div>
            <div class="detail-list">
              <div class="detail-row"><span>Branches</span><strong>${escapeHtml(business.branches)}</strong></div>
              <div class="detail-row"><span>Total Received</span><strong>${escapeHtml(business.received)}</strong></div>
              <div class="detail-row"><span>Owner</span><strong>${escapeHtml(state.merchant.wallet)}</strong></div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="card">
        <h3>New Business</h3>
        <form class="form gap-top" id="createBusinessForm">
          <div class="field"><label>Business Name</label><input name="name" placeholder="Rosa Cafe" required></div>
          <div class="field"><label>Slug</label><input name="slug" placeholder="rosa-cafe"></div>
          <button class="btn btn-primary" type="submit">Create Business</button>
        </form>
      </div>
    </div>
  `;
}

function branchOptions(selectedBusinessId = "") {
  return state.businesses
    .map((business) => `<option value="${escapeHtml(business.id)}" ${business.id === selectedBusinessId ? "selected" : ""}>${escapeHtml(business.name)}</option>`)
    .join("");
}

function renderBranches() {
  return `
    ${pageTop("Branches", "Create and manage payment locations for each business.")}
    <div class="grid two-col">
      <div class="card">${table(["Branch", "Business", "Wallet", "Payments", "Status"], state.branches.map((b) => `<tr><td><strong>${escapeHtml(b.name)}</strong></td><td>${escapeHtml(b.business)}</td><td>${escapeHtml(b.wallet)}</td><td>${escapeHtml(b.payments)}</td><td>${badge(b.status)}</td></tr>`).join(""))}</div>
      <div class="card">
        <h3>New Branch</h3>
        <form class="form gap-top" id="createBranchForm">
          <div class="field"><label>Business</label><select name="businessId">${branchOptions()}</select></div>
          <div class="field"><label>Branch Name</label><input name="name" placeholder="Alsancak Branch" required></div>
          <div class="field"><label>Destination Wallet</label><input name="wallet" placeholder="G..." minlength="56" maxlength="56" required><small>Use a real Stellar TESTNET public key for live payments.</small></div>
          <button class="btn btn-primary" type="submit">Create Branch</button>
        </form>
      </div>
      <div class="card">
        <h3>Testnet Funding</h3>
        <form class="form gap-top" id="fundTestnetForm">
          <div class="field"><label>Wallet Address</label><input name="address" placeholder="G..." minlength="56" maxlength="56" required><small>Funds a testnet wallet through Stellar Friendbot.</small></div>
          <button class="btn" type="submit">Fund Testnet Wallet</button>
        </form>
      </div>
    </div>
  `;
}

function renderLiveTest() {
  return `
    ${pageTop("Live Test Setup", "Prepare a real Stellar testnet branch and payment request.")}
    <div class="grid two-col">
      <div class="card">
        <h3>Setup Live Payment</h3>
        <form class="form gap-top" id="liveTestForm">
          <div class="field"><label>Business</label><select name="businessId">${branchOptions("bus_01")}</select></div>
          <div class="field"><label>Branch Name</label><input name="branchName" value="Live Test Branch" required></div>
          <div class="field"><label>Merchant Destination Wallet</label><input name="wallet" placeholder="G..." minlength="56" maxlength="56" required><small>Use a real Stellar TESTNET public key. This wallet receives the payment.</small></div>
          <div class="field"><label>Amount</label><input name="amount" value="1.00" inputmode="decimal" required><small>Use a small amount for testnet validation.</small></div>
          <div class="field"><label>Description</label><input name="description" value="Live Stellar test payment"></div>
          <label class="inline-check"><input name="fundWallet" type="checkbox" checked> Fund destination wallet with Friendbot first</label>
          <button class="btn btn-primary" type="submit">Create Live Test Payment</button>
        </form>
      </div>
      <div class="card">
        <h3>What This Does</h3>
        <div class="detail-list gap-top">
          <div class="detail-row"><span>Network</span><strong>Stellar Testnet</strong></div>
          <div class="detail-row"><span>Destination</span><strong>Your branch wallet</strong></div>
          <div class="detail-row"><span>Payment status</span><strong>Starts PENDING</strong></div>
          <div class="detail-row"><span>Paid rule</span><strong>Only after Horizon verification</strong></div>
        </div>
      </div>
    </div>
  `;
}

function branchesForSelectedBusiness() {
  return state.branches;
}

function renderPayments() {
  const hasPayments = state.payments.length > 0;
  return `
    ${pageTop("Payment Requests", "Track QR payment requests and statuses.", `<button class="btn btn-primary" data-screen="create-payment">Create Payment</button>`)}
    <div class="card">
      ${hasPayments
        ? table(["Payment ID", "Business", "Branch", "Amount", "Memo", "Status", "Created"], state.payments.map((p) => `<tr class="clickable-row" data-payment="${escapeHtml(p.id)}"><td><strong>${escapeHtml(p.id)}</strong></td><td>${escapeHtml(p.business)}</td><td>${escapeHtml(p.branch)}</td><td>${escapeHtml(p.amount)} ${escapeHtml(p.asset)}</td><td>${escapeHtml(p.memo)}</td><td>${badge(p.status)}</td><td>${escapeHtml(p.created)}</td></tr>`).join(""))
        : `<div class="empty">No payment requests yet.</div>`}
    </div>
  `;
}

function renderCreatePayment() {
  return `
    ${pageTop("Create Payment Request", "Generate a secure QR payment request for your customer.")}
    <div class="grid two-col">
      <div class="card">
        <form class="form" id="createPaymentForm">
          <div class="field"><label>Business</label><select name="businessId">${state.businesses.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Branch</label><select name="branchId">${branchesForSelectedBusiness().map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)} - ${escapeHtml(b.business)}</option>`).join("")}</select></div>
          <div class="field"><label>Amount</label><input name="amount" value="10.00" inputmode="decimal"></div>
          <div class="field"><label>Asset</label><select name="asset"><option>XLM</option><option disabled>USDC - Coming soon</option></select></div>
          <div class="field"><label>Expires In</label><select name="expiresInMinutes"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option><option value="60">1 hour</option><option value="1440">24 hours</option></select></div>
          <div class="field"><label>Description</label><textarea name="description" rows="3">Coffee payment</textarea></div>
          <button class="btn btn-primary" type="submit">Generate QR Code</button>
        </form>
      </div>
      <div class="card">
        <h3>Payment Security Rules</h3>
        <div class="detail-list">
          <div class="detail-row"><span>Private key storage</span><strong>Never</strong></div>
          <div class="detail-row"><span>Payment ID</span><strong>Unique</strong></div>
          <div class="detail-row"><span>Memo</span><strong>Required</strong></div>
          <div class="detail-row"><span>Verification</span><strong>On-chain</strong></div>
          <div class="detail-row"><span>Network</span><strong>Testnet</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderPaymentDetail() {
  const payment = getPayment();
  const transaction = getCheckoutTransaction();
  const statusTone = paymentStatusTone(payment.status);
  const paymentActions = payment.status === "PENDING"
    ? `<button class="btn" data-screen="customer-checkout">Preview Checkout</button><button class="btn btn-primary" id="refreshPaymentDetail">Refresh Status</button>`
    : payment.status === "PAID"
      ? `<button class="btn" data-screen="customer-success">View Customer Receipt</button><button class="btn btn-primary" id="refreshPaymentDetail">Refresh Status</button>`
      : `<button class="btn btn-primary" id="refreshPaymentDetail">Refresh Status</button>`;
  const payload = {
    type: "rosa_payment_request",
    network: state.network.id,
    paymentRequestId: payment.id,
    destination: payment.destination,
    amount: payment.amount,
    asset: payment.asset,
    memo: payment.memo
  };

  return `
    ${pageTop("Payment Request", "Payment request detail and QR code.", paymentActions)}
    <div class="checkout-status ${statusTone}">
      <strong>${escapeHtml(payment.status)}</strong>
      <span>${payment.status === "PENDING" ? "Awaiting wallet approval or on-chain verification" : payment.status === "PAID" ? "Payment verified and recorded" : "Payment request has expired"}</span>
    </div>
    <div class="grid two-col">
      <div class="card">
        <div class="card-header"><div><h3>${escapeHtml(payment.id)}</h3><p>${escapeHtml(payment.created)}</p></div>${badge(payment.status)}</div>
        ${payment.status === "PENDING" ? qr() : `<div class="receipt-panel ${statusTone}"><strong>${escapeHtml(payment.status)}</strong><span>${payment.status === "PAID" ? "QR is no longer payable" : "Expired checkout link"}</span></div>`}
        <div class="detail-list">
          <div class="detail-row"><span>Amount</span><strong>${escapeHtml(payment.amount)} ${escapeHtml(payment.asset)}</strong></div>
          <div class="detail-row"><span>Destination</span><strong>${escapeHtml(payment.destination)}</strong></div>
          <div class="detail-row"><span>Memo</span><strong>${escapeHtml(payment.memo)}</strong></div>
          <div class="detail-row"><span>Expires In</span><strong>${escapeHtml(payment.expiresIn)}</strong></div>
          <div class="detail-row"><span>Expires At</span><strong>${escapeHtml(payment.expiresAt || "Legacy mock")}</strong></div>
          <div class="detail-row"><span>Status</span><strong>${badge(payment.status)}</strong></div>
        </div>
      </div>
      <div class="card">
        ${transaction ? `
          <h3>Receipt</h3>
          <div class="detail-list gap-top">
            <div class="detail-row"><span>Transaction Hash</span><strong>${escapeHtml(transaction.hash)}</strong></div>
            <div class="detail-row"><span>Customer</span><strong>${escapeHtml(transaction.customer)}</strong></div>
            <div class="detail-row"><span>Amount</span><strong>${escapeHtml(transaction.amount)}</strong></div>
            <div class="detail-row"><span>Confirmed</span><strong>${escapeHtml(transaction.time)}</strong></div>
          </div>
        ` : `
          <h3>Payment Link</h3>
          <input readonly value="${escapeHtml(`${location.origin}/checkout/${payment.id}`)}">
          <div class="gap-top"></div>
          <h3>QR Payload Preview</h3>
          <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
        `}
      </div>
    </div>
  `;
}

function renderTransactions() {
  return `${pageTop("Transactions", "Verified and failed Stellar transaction records.")}<div class="card">${table(["Hash", "Payment", "Customer", "Amount", "Status", "Time"], state.transactions.map((t) => `<tr><td><strong>${escapeHtml(t.hash)}</strong></td><td>${escapeHtml(t.payment)}</td><td>${escapeHtml(t.customer)}</td><td>${escapeHtml(t.amount)}</td><td>${badge(t.status)}</td><td>${escapeHtml(t.time)}</td></tr>`).join(""))}</div>`;
}

function renderCustomers() {
  return `${pageTop("Customers", "Customers are tracked by wallet address, no account required.")}<div class="card">${table(["Wallet", "Payments", "Volume", "First Seen"], state.customers.map((c) => `<tr><td><strong>${escapeHtml(c.wallet)}</strong></td><td>${escapeHtml(c.payments)}</td><td>${escapeHtml(c.volume)}</td><td>${escapeHtml(c.firstSeen)}</td></tr>`).join(""))}</div>`;
}

function renderSecurity() {
  return `
    ${pageTop("Security Model", "Non-custodial payment infrastructure for Stellar.")}
    <div class="grid three-col">
      <div class="card"><h3>Non-Custodial</h3><p>Rosa Pay never stores private keys, secret keys, seed phrases or user funds.</p></div>
      <div class="card"><h3>Verified On-Chain</h3><p>Payment status changes only after transaction hash, memo, destination, amount, asset and network checks.</p></div>
      <div class="card"><h3>QR Protection</h3><p>Every QR has a unique payment request ID, memo and expiry time.</p></div>
    </div>
    <div class="card gap-top">
      <h3>Audit Events</h3>
      ${table(["Event", "Entity", "Time"], state.auditEvents.map((event) => `<tr><td>${escapeHtml(event.event)}</td><td><strong>${escapeHtml(event.entity)}</strong></td><td>${escapeHtml(event.time)}</td></tr>`).join(""))}
    </div>
  `;
}

function renderSettings() {
  return `
    ${pageTop("Settings", "Manage merchant preferences and checkout configuration.")}
    <div class="grid two-col">
      <div class="card">
        <h3>Merchant Profile</h3>
        <div class="form gap-top">
          <div class="field"><label>Display Name</label><input value="${escapeHtml(state.merchant.name)}"></div>
          <div class="field"><label>Email</label><input value="${escapeHtml(state.merchant.email)}"></div>
          <div class="field"><label>Default Network</label><select><option>${escapeHtml(state.network.label)}</option><option disabled>Stellar Mainnet - Coming soon</option></select></div>
          <button class="btn btn-primary">Save Settings</button>
        </div>
      </div>
      <div class="card">
        <h3>Checkout Options</h3>
        <div class="detail-list">
          <div class="detail-row"><span>Customer account required</span><strong>No</strong></div>
          <div class="detail-row"><span>Default expiry</span><strong>30 minutes</strong></div>
          <div class="detail-row"><span>Supported asset</span><strong>XLM</strong></div>
          <div class="detail-row"><span>Wallet strategy</span><strong>Freighter first</strong></div>
        </div>
      </div>
    </div>
  `;
}

function phoneShell(inner) {
  return `<div class="phone-area"><div class="phone"><div class="phone-screen">${inner}</div></div></div>`;
}

function mobileHeader(title) {
  return `<div class="mobile-header"><span>9:41</span><strong>${escapeHtml(title)}</strong><span>5G</span></div>`;
}

function renderCustomerQR() {
  return phoneShell(`
    ${mobileHeader("Camera")}
    <div class="qr-stage">${qr()}</div>
    <div class="mobile-actions"><button class="btn btn-primary" data-screen="customer-checkout">Simulate QR Scan</button></div>
  `);
}

function renderCustomerCheckout() {
  const payment = getCheckoutPayment();
  const statusTone = paymentStatusTone(payment.status);
  const actions = payment.status === "PENDING"
    ? `<button class="btn btn-primary" data-screen="customer-wallet">Connect Wallet</button><button class="btn" id="refreshCheckout">Refresh Status</button>`
    : payment.status === "PAID"
      ? `<button class="btn btn-primary" data-screen="customer-success">View Receipt</button><button class="btn" id="refreshCheckout">Refresh Status</button>`
      : `<button class="btn" id="refreshCheckout">Refresh Status</button>`;

  return phoneShell(`
    ${mobileHeader("Checkout")}
    <div class="checkout-brand"><div class="brand-mark">R</div><div><h2>Rosa Pay</h2><div>${escapeHtml(payment.business)}</div></div></div>
    <div class="checkout-status ${statusTone}">
      <strong>${escapeHtml(payment.status)}</strong>
      <span>${payment.status === "PENDING" ? "Waiting for wallet approval" : payment.status === "PAID" ? "Payment verified on mock Stellar" : "This payment request is no longer payable"}</span>
    </div>
    <div class="card">
      <div class="card-header"><div><h3>${escapeHtml(payment.business)}</h3><p>${escapeHtml(payment.branch)}</p></div>${badge("TESTNET")}</div>
      <div class="amount-card">
        <div>You are paying</div>
        <div class="big-amount">${escapeHtml(payment.amount)} <span>${escapeHtml(payment.asset)}</span></div>
      </div>
      <div class="detail-list">
        <div class="detail-row"><span>Network</span><strong>${escapeHtml(state.network.label)}</strong></div>
        <div class="detail-row"><span>Memo</span><strong>${escapeHtml(payment.memo)}</strong></div>
        <div class="detail-row"><span>Expires In</span><strong>${escapeHtml(payment.expiresIn)}</strong></div>
      </div>
      <div class="mobile-actions">${actions}</div>
    </div>
  `);
}

function renderCustomerWallet() {
  return phoneShell(`
    ${mobileHeader("Wallet")}
    <button class="btn" data-screen="customer-checkout">Back</button>
    <h2>Connect Wallet</h2>
    ${["Freighter|Browser Extension", "WalletConnect|Mobile Wallets", "Lobstr|Mobile Wallet", "Albedo|Web Wallet"].map((wallet) => {
      const [name, sub] = wallet.split("|");
      return `<div class="wallet-option" data-screen="customer-review"><div class="wallet-left"><div class="wallet-icon">${escapeHtml(name[0])}</div><div><strong>${escapeHtml(name)}</strong><div>${escapeHtml(sub)}</div></div></div><span>›</span></div>`;
    }).join("")}
    <div class="mobile-actions">
      <button class="btn" id="fundFreighterWallet">Fund Freighter Testnet Wallet</button>
    </div>
  `);
}

function renderCustomerReview() {
  const payment = getCheckoutPayment();
  if (payment.status !== "PENDING") {
    return phoneShell(`
      ${mobileHeader("Review")}
      <button class="btn" data-screen="customer-checkout">Back</button>
      <div class="checkout-status ${paymentStatusTone(payment.status)}">
        <strong>${escapeHtml(payment.status)}</strong>
        <span>${payment.status === "PAID" ? "This request has already been paid" : "This request has expired"}</span>
      </div>
      <div class="mobile-actions"><button class="btn btn-primary" data-screen="customer-checkout">Return to Checkout</button></div>
    `);
  }

  return phoneShell(`
    ${mobileHeader("Review")}
    <button class="btn" data-screen="customer-wallet">Back</button>
    <h2>Review Payment</h2>
    <div class="card">
      <div class="detail-list">
        <div class="detail-row"><span>Merchant</span><strong>${escapeHtml(payment.business)}</strong></div>
        <div class="detail-row"><span>Amount</span><strong>${escapeHtml(payment.amount)} ${escapeHtml(payment.asset)}</strong></div>
        <div class="detail-row"><span>Network</span><strong>${escapeHtml(state.network.label)}</strong></div>
        <div class="detail-row"><span>Memo</span><strong>${escapeHtml(payment.memo)}</strong></div>
        <div class="detail-row"><span>Network Fee</span><strong>0.00001 XLM</strong></div>
      </div>
      <div class="mobile-actions"><button class="btn btn-primary" id="payWithFreighter">Pay with Freighter</button><button class="btn" data-screen="customer-wallet">Try another wallet</button></div>
    </div>
  `);
}

function renderCustomerSuccess() {
  const payment = getCheckoutPayment();
  const transaction = getCheckoutTransaction();
  return phoneShell(`
    ${mobileHeader("Success")}
    <div class="success-check">✓</div>
    <h2 class="center">Payment Successful</h2>
    <div class="card">
      <div class="big-amount center">${escapeHtml(payment.amount)} <span>${escapeHtml(payment.asset)}</span></div>
      <div class="detail-list">
        <div class="detail-row"><span>Status</span><strong>${badge(payment.status)}</strong></div>
        <div class="detail-row"><span>Transaction</span><strong>${escapeHtml(transaction?.hash || "Pending sync")}</strong></div>
        <div class="detail-row"><span>Customer</span><strong>${escapeHtml(transaction?.customer || "GNEW...TEST")}</strong></div>
        <div class="detail-row"><span>Network</span><strong>${escapeHtml(state.network.label)}</strong></div>
      </div>
      <div class="mobile-actions"><button class="btn btn-primary" data-screen="overview">Back to Merchant</button><button class="btn" id="refreshCheckout">Refresh Receipt</button></div>
    </div>
  `);
}

const renderers = {
  overview: renderOverview,
  businesses: renderBusinesses,
  branches: renderBranches,
  payments: renderPayments,
  "create-payment": renderCreatePayment,
  "payment-detail": renderPaymentDetail,
  transactions: renderTransactions,
  customers: renderCustomers,
  "live-test": renderLiveTest,
  security: renderSecurity,
  settings: renderSettings,
  "customer-qr": renderCustomerQR,
  "customer-checkout": renderCustomerCheckout,
  "customer-wallet": renderCustomerWallet,
  "customer-review": renderCustomerReview,
  "customer-success": renderCustomerSuccess
};

function renderShell(activeScreen = "overview") {
  app.innerHTML = `
    <div class="mobile-only-nav"><select class="mobile-select" id="mobileScreenSelect">${[...merchantScreens, ...customerScreens].map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join("")}</select></div>
    <div class="app">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">R</div><div><h1>Rosa Pay</h1><p>Non-Custodial QR Payments on Stellar</p></div></div>
        <div><div class="nav-group-label">Merchant</div><nav class="nav">${merchantScreens.map(([id, label, icon]) => navButton(id, label, icon, activeScreen)).join("")}</nav></div>
        <div><div class="nav-group-label">Customer</div><nav class="nav">${customerScreens.map(([id, label, icon]) => navButton(id, label, icon, activeScreen)).join("")}</nav></div>
        <div class="sidebar-footer"><div class="profile"><div class="avatar">${escapeHtml(state.merchant.name[0])}</div><div><strong>${escapeHtml(state.merchant.name)}</strong><div>${escapeHtml(state.merchant.wallet)}</div></div></div></div>
      </aside>
      <main class="main"><section id="screen">${renderers[activeScreen]()}</section></main>
    </div>
  `;

  document.getElementById("mobileScreenSelect").value = activeScreen;
  bindEvents();
}

function navButton(id, label, icon, activeScreen) {
  return `<button data-screen="${id}" class="${id === activeScreen ? "active" : ""}"><span>${escapeHtml(icon)}</span>${escapeHtml(label)}</button>`;
}

function showScreen(id) {
  clearError();
  renderShell(id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function refreshState() {
  const [bootstrap, overview] = await Promise.all([api.bootstrap(), api.overview()]);
  state = { ...bootstrap, overview };
}

async function refreshCheckoutDetail() {
  checkoutDetail = await api.getCheckout(selectedPaymentId);
  const index = state.payments.findIndex((payment) => payment.id === checkoutDetail.payment.id);
  if (index >= 0) state.payments[index] = checkoutDetail.payment;
}

async function refreshPaymentDetail() {
  paymentDetail = await api.getPayment(selectedPaymentId);
  const index = state.payments.findIndex((payment) => payment.id === paymentDetail.payment.id);
  if (index >= 0) state.payments[index] = paymentDetail.payment;
}

async function openCustomerScreen(id) {
  await refreshCheckoutDetail();
  showScreen(id);
}

function bindEvents() {
  document.querySelectorAll("[data-screen]").forEach((element) => {
    element.addEventListener("click", async () => {
      const target = element.dataset.screen;
      if (target.startsWith("customer-")) {
        await openCustomerScreen(target);
        return;
      }

      if (target === "payment-detail") {
        await refreshPaymentDetail();
      }

      showScreen(target);
    });
  });

  document.querySelectorAll("[data-payment]").forEach((element) => {
    element.addEventListener("click", () => {
      selectedPaymentId = element.dataset.payment;
      checkoutDetail = null;
      paymentDetail = null;
      refreshPaymentDetail().then(() => showScreen("payment-detail")).catch((error) => {
        showError(error);
        showScreen("payments");
      });
    });
  });

  const mobileSelect = document.getElementById("mobileScreenSelect");
  mobileSelect?.addEventListener("change", (event) => showScreen(event.target.value));

  const form = document.getElementById("createPaymentForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      clearError();
      const input = Object.fromEntries(new FormData(form));
      const result = await api.createPayment(input);
      selectedPaymentId = result.payment.id;
      checkoutDetail = null;
      paymentDetail = { payment: result.payment, transaction: null };
      await refreshState();
      showScreen("payment-detail");
    } catch (error) {
      showError(error);
      renderShell("create-payment");
    }
  });

  const businessForm = document.getElementById("createBusinessForm");
  businessForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      clearError();
      const input = Object.fromEntries(new FormData(businessForm));
      await api.createBusiness(input);
      await refreshState();
      showScreen("businesses");
    } catch (error) {
      showError(error);
      renderShell("businesses");
    }
  });

  const branchForm = document.getElementById("createBranchForm");
  branchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      clearError();
      const input = Object.fromEntries(new FormData(branchForm));
      await api.createBranch(input);
      await refreshState();
      showScreen("branches");
    } catch (error) {
      showError(error);
      renderShell("branches");
    }
  });

  const liveTestForm = document.getElementById("liveTestForm");
  liveTestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      clearError();
      const input = Object.fromEntries(new FormData(liveTestForm));

      if (input.fundWallet === "on") {
        await api.fundTestnetAccount({ address: input.wallet });
      }

      const branchResult = await api.createBranch({
        businessId: input.businessId,
        name: input.branchName,
        wallet: input.wallet
      });

      const paymentResult = await api.createPayment({
        branchId: branchResult.branch.id,
        amount: input.amount,
        asset: "XLM",
        expiresInMinutes: "60",
        description: input.description
      }, {
        idempotencyKey: `live-${input.wallet}-${input.amount}`
      });

      selectedPaymentId = paymentResult.payment.id;
      checkoutDetail = null;
      paymentDetail = { payment: paymentResult.payment, transaction: null };
      await refreshState();
      flashMessage = "Live test payment created. Open checkout and pay with Freighter TESTNET.";
      flashKind = "success";
      renderShell("payment-detail");
    } catch (error) {
      showError(error);
      renderShell("live-test");
    }
  });

  const fundForm = document.getElementById("fundTestnetForm");
  fundForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      clearError();
      const input = Object.fromEntries(new FormData(fundForm));
      await api.fundTestnetAccount(input);
      flashMessage = "Testnet wallet funded.";
      flashKind = "success";
      renderShell("branches");
    } catch (error) {
      showError(error);
      renderShell("branches");
    }
  });

  const payButton = document.getElementById("payWithFreighter");
  payButton?.addEventListener("click", async () => {
    try {
      clearError();
      const payment = getCheckoutPayment();
      await payWithFreighter(payment);
      await refreshState();
      await openCustomerScreen("customer-success");
    } catch (error) {
      showError(error);
      renderShell("customer-review");
    }
  });

  const fundFreighterButton = document.getElementById("fundFreighterWallet");
  fundFreighterButton?.addEventListener("click", async () => {
    try {
      clearError();
      const freighter = getFreighterApi();
      const access = await freighter.requestAccess();
      if (access?.error) throw new Error(access.error.message || access.error);
      if (!access.address) throw new Error("Freighter did not return a public key.");
      await api.fundTestnetAccount({ address: access.address });
      flashMessage = "Freighter TESTNET wallet funded.";
      flashKind = "success";
      renderShell("customer-wallet");
    } catch (error) {
      showError(error);
      renderShell("customer-wallet");
    }
  });

  const refreshButton = document.getElementById("refreshCheckout");
  refreshButton?.addEventListener("click", async () => {
    try {
      clearError();
      await refreshState();
      await openCustomerScreen(document.getElementById("mobileScreenSelect")?.value || "customer-checkout");
    } catch (error) {
      showError(error);
      renderShell("customer-checkout");
    }
  });

  const refreshPaymentButton = document.getElementById("refreshPaymentDetail");
  refreshPaymentButton?.addEventListener("click", async () => {
    try {
      clearError();
      await refreshState();
      await refreshPaymentDetail();
      renderShell("payment-detail");
    } catch (error) {
      showError(error);
      renderShell("payment-detail");
    }
  });
}

async function init() {
  app.innerHTML = `<main class="main"><div class="card">Loading Rosa Pay...</div></main>`;
  await refreshState();
  const checkoutMatch = location.pathname.match(/^\/checkout\/([^/]+)$/);
  if (checkoutMatch) {
    selectedPaymentId = checkoutMatch[1];
    await refreshCheckoutDetail();
    renderShell("customer-checkout");
    return;
  }

  renderShell("overview");
}

init().catch((error) => {
  app.innerHTML = `<main class="main"><div class="card error">${escapeHtml(error.message)}</div></main>`;
});
