import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { mockData } from "../../../packages/domain/src/mockData.js";

function encode(value) {
  return JSON.stringify(value);
}

function decode(row) {
  return row ? JSON.parse(row.data) : null;
}

function decodeRows(rows) {
  return rows.map((row) => JSON.parse(row.data));
}

export function createSqliteStore({ databasePath }) {
  mkdirSync(dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      hash TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_seed (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_records (
      key TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      payment_id TEXT,
      data TEXT NOT NULL
    );
  `);

  const merchantCount = db.prepare("SELECT COUNT(*) AS count FROM merchants").get().count;
  if (merchantCount === 0) {
    seed(db);
  }

  function all(table, orderBy = "rowid DESC") {
    return decodeRows(db.prepare(`SELECT data FROM ${table} ORDER BY ${orderBy}`).all());
  }

  return {
    getState() {
      return {
        merchant: decode(db.prepare("SELECT data FROM merchants LIMIT 1").get()),
        businesses: this.listBusinesses(),
        branches: this.listBranches(),
        payments: this.listPayments(),
        transactions: all("transactions"),
        customers: decodeRows(db.prepare("SELECT data FROM customer_seed ORDER BY rowid").all()),
        auditEvents: all("audit_events")
      };
    },

    listBusinesses() {
      return all("businesses");
    },

    listBranches() {
      return all("branches");
    },

    addBusiness(business) {
      db.prepare("INSERT INTO businesses (id, data) VALUES (?, ?)").run(business.id, encode(business));
      return business;
    },

    addBranch(branch) {
      db.prepare("INSERT INTO branches (id, business_id, data) VALUES (?, ?, ?)").run(branch.id, branch.businessId, encode(branch));
      const business = this.listBusinesses().find((item) => item.id === branch.businessId);
      if (business) {
        business.branches += 1;
        db.prepare("UPDATE businesses SET data = ? WHERE id = ?").run(encode(business), business.id);
      }
      return branch;
    },

    listPayments() {
      return all("payment_requests");
    },

    findPaymentById(id) {
      return decode(db.prepare("SELECT data FROM payment_requests WHERE id = ?").get(id));
    },

    findTransactionByHash(hash) {
      return decode(db.prepare("SELECT data FROM transactions WHERE hash = ?").get(hash));
    },

    findTransactionByPaymentId(paymentId) {
      return decode(db.prepare("SELECT data FROM transactions WHERE payment_id = ? ORDER BY rowid DESC LIMIT 1").get(paymentId));
    },

    findIdempotencyRecord(key) {
      return decode(db.prepare("SELECT data FROM idempotency_records WHERE key = ?").get(key));
    },

    saveIdempotencyRecord(key, record) {
      db.prepare("INSERT INTO idempotency_records (key, operation, payment_id, data) VALUES (?, ?, ?, ?)").run(
        key,
        record.operation,
        record.paymentId || null,
        encode(record)
      );
      return record;
    },

    addPayment(payment) {
      db.prepare("INSERT INTO payment_requests (id, status, data) VALUES (?, ?, ?)").run(payment.id, payment.status, encode(payment));
      return payment;
    },

    updatePaymentStatus(id, status) {
      const payment = this.findPaymentById(id);
      if (!payment) return null;
      payment.status = status;
      db.prepare("UPDATE payment_requests SET status = ?, data = ? WHERE id = ?").run(status, encode(payment), id);
      return payment;
    },

    addTransaction(transaction) {
      db.prepare("INSERT INTO transactions (hash, payment_id, data) VALUES (?, ?, ?)").run(transaction.hash, transaction.payment, encode(transaction));
      return transaction;
    },

    addAuditEvent(event) {
      db.prepare("INSERT INTO audit_events (entity, data) VALUES (?, ?)").run(event.entity, encode(event));
      return event;
    }
  };
}

function seed(db) {
  db.prepare("INSERT INTO merchants (id, data) VALUES (?, ?)").run(mockData.merchant.id, encode(mockData.merchant));

  for (const business of [...mockData.businesses].reverse()) {
    db.prepare("INSERT INTO businesses (id, data) VALUES (?, ?)").run(business.id, encode(business));
  }

  for (const branch of [...mockData.branches].reverse()) {
    db.prepare("INSERT INTO branches (id, business_id, data) VALUES (?, ?, ?)").run(branch.id, branch.businessId, encode(branch));
  }

  for (const payment of [...mockData.payments].reverse()) {
    db.prepare("INSERT INTO payment_requests (id, status, data) VALUES (?, ?, ?)").run(payment.id, payment.status, encode(payment));
  }

  for (const transaction of [...mockData.transactions].reverse()) {
    db.prepare("INSERT INTO transactions (hash, payment_id, data) VALUES (?, ?, ?)").run(transaction.hash, transaction.payment, encode(transaction));
  }

  for (const event of [...mockData.auditEvents].reverse()) {
    db.prepare("INSERT INTO audit_events (entity, data) VALUES (?, ?)").run(event.entity, encode(event));
  }

  for (const customer of mockData.customers) {
    db.prepare("INSERT INTO customer_seed (id, data) VALUES (?, ?)").run(customer.wallet, encode(customer));
  }
}
