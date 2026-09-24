"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

type Method = {
  id: number;
  method_code: string;
  display_name: string;
  direction: "deposit" | "withdrawal" | "both";
  instructions: string;
  min_amount: number | null;
  max_amount: number | null;
  currency: string;
};

type RequestRow = {
  id: string;
  request_type: string;
  amount: number;
  currency: string;
  method: string;
  transaction_reference: string | null;
  status: string;
  created_at: string;
};

export default function CashierPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [methods, setMethods] = useState<Method[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Please sign in to use the cashier.");
      return;
    }

    const [{ data: methodRows }, { data: requestRows }, { data: wallet }] = await Promise.all([
      supabase.from("cashier_methods").select("id,method_code,display_name,direction,instructions,min_amount,max_amount,currency").eq("enabled", true),
      supabase.from("cashier_requests").select("id,request_type,amount,currency,method,transaction_reference,status,created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("wallets").select("balance,currency").eq("user_id", userData.user.id).maybeSingle(),
    ]);

    setMethods((methodRows as Method[]) || []);
    setRequests((requestRows as RequestRow[]) || []);
    if (wallet) {
      setBalance(Number(wallet.balance));
      setCurrency(wallet.currency || "USD");
    }
  }

  useEffect(() => { void load(); }, []);

  const usableMethods = methods.filter((m) => m.direction === "both" || m.direction === mode);

  useEffect(() => {
    if (!usableMethods.some((m) => m.method_code === method)) {
      setMethod(usableMethods[0]?.method_code || "");
    }
  }, [mode, methods]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const value = Number(amount);
    const selected = usableMethods.find((m) => m.method_code === method);
    if (!selected || !Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid amount and choose an enabled payment method.");
      return;
    }
    if (selected.min_amount !== null && value < Number(selected.min_amount)) {
      setMessage("The amount is below this method's minimum.");
      return;
    }
    if (selected.max_amount !== null && value > Number(selected.max_amount)) {
      setMessage("The amount is above this method's maximum.");
      return;
    }

    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Please sign in first.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("cashier_requests").insert({
      user_id: userData.user.id,
      request_type: mode,
      amount: value,
      currency,
      method: selected.method_code,
      transaction_reference: reference.trim() || null,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setAmount("");
      setReference("");
      setNote("");
      setMessage(mode === "deposit"
        ? "Deposit request submitted. It will remain pending until the cashier team verifies the payment."
        : "Withdrawal request submitted. No wallet funds are released until the cashier team verifies and completes the request.");
      await load();
    }
    setBusy(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07100d", color: "#eef7f2", padding: "24px 16px 80px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <a href="/" style={{ color: "#7ee2a8", textDecoration: "none" }}>← BETNOW365</a>
        <h1 style={{ marginBottom: 6 }}>Cashier</h1>
        <p style={{ color: "#9eb2aa" }}>Manual deposit and withdrawal requests with review, auditability, and no client-side wallet mutation.</p>

        <section style={{ background: "#0d1915", border: "1px solid #20362c", borderRadius: 16, padding: 18, marginTop: 18 }}>
          <div style={{ color: "#9eb2aa", fontSize: 13 }}>Available balance</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{balance === null ? "—" : balance.toFixed(2)} {currency}</div>
        </section>

        <section style={{ background: "#0d1915", border: "1px solid #20362c", borderRadius: 16, padding: 18, marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {(["deposit", "withdrawal"] as const).map((x) => (
              <button key={x} onClick={() => setMode(x)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #365246", background: mode === x ? "#d8ff32" : "#12221c", color: "#07100d", fontWeight: 800 }}>
                {x === "deposit" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <label>Amount<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={inputStyle} /></label>
            <label>Method<select value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
              {usableMethods.length ? usableMethods.map((m) => <option key={m.method_code} value={m.method_code}>{m.display_name}</option>) : <option value="">No enabled methods</option>}
            </select></label>
            {usableMethods.find((m) => m.method_code === method)?.instructions && (
              <div style={{ padding: 12, background: "#101f19", borderRadius: 10, color: "#b8cbc3", fontSize: 13 }}>
                {usableMethods.find((m) => m.method_code === method)?.instructions}
              </div>
            )}
            <label>Transaction reference (optional)<input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Payment/reference ID" style={inputStyle} /></label>
            <label>Note (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={inputStyle} /></label>
            <button disabled={busy || !method} style={{ padding: 13, border: 0, borderRadius: 10, background: "#f5c400", color: "#111", fontWeight: 900 }}>
              {busy ? "Submitting…" : mode === "deposit" ? "Submit deposit request" : "Submit withdrawal request"}
            </button>
          </form>
          {message && <div style={{ marginTop: 14, color: "#b8cbc3" }}>{message}</div>}
        </section>

        <section style={{ marginTop: 18 }}>
          <h2>Recent requests</h2>
          {requests.length === 0 ? <p style={{ color: "#82968e" }}>No cashier requests yet.</p> : requests.map((r) => (
            <div key={r.id} style={{ background: "#0d1915", border: "1px solid #20362c", borderRadius: 12, padding: 14, marginTop: 9, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><strong>{r.request_type === "deposit" ? "Deposit" : "Withdrawal"}</strong><div style={{ color: "#82968e", fontSize: 12 }}>{new Date(r.created_at).toLocaleString()} · {r.method}</div></div>
              <div style={{ textAlign: "right" }}><strong>{Number(r.amount).toFixed(2)} {r.currency}</strong><div style={{ color: "#d8ff32", fontSize: 12 }}>{r.status}</div></div>
            </div>
          ))}
        </section>

        <p style={{ color: "#71857d", fontSize: 12, marginTop: 22 }}>
          Manual cashier requests do not change the wallet balance from the browser. Approval/completion must be performed by authorized back-office tooling after KYC, jurisdiction, fraud, payment verification, and reconciliation checks.
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  boxSizing: "border-box" as const,
  background: "#07100d",
  color: "#eef7f2",
  border: "1px solid #365246",
  borderRadius: 9,
  padding: "11px 12px",
};
