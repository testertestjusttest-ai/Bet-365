"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";

type Row = {
  id: string; user_id: string; request_type: string; amount: number; currency: string;
  method: string; transaction_reference: string | null; status: string;
  reviewed_by: string | null; created_at: string; rejection_reason: string | null;
};

export default function AdminCashierPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setMessage("Sign in required."); setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("admin_role").eq("id", userData.user.id).maybeSingle();
    if (!profile || !["finance_admin", "super_admin"].includes(profile.admin_role)) {
      setMessage("Finance-admin access required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("cashier_requests")
      .select("id,user_id,request_type,amount,currency,method,transaction_reference,status,reviewed_by,created_at,rejection_reason")
      .order("created_at", { ascending: false }).limit(100);
    if (error) setMessage(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function setStatus(row: Row, status: "under_review" | "approved" | "rejected" | "completed") {
    setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const patch: Record<string, unknown> = { status };
    if (["approved", "rejected", "completed"].includes(status)) {
      patch.reviewed_by = userData.user.id;
      patch.reviewed_at = new Date().toISOString();
    }
    if (status === "rejected") patch.rejection_reason = "Rejected by finance review.";
    const { error } = await supabase.from("cashier_requests").update(patch).eq("id", row.id);
    if (error) setMessage(error.message);
    else await load();
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07100d", color: "#eef7f2", padding: "24px 16px 80px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <a href="/" style={{ color: "#7ee2a8" }}>← BETNOW365</a>
        <h1>Cashier Administration</h1>
        <p style={{ color: "#9eb2aa" }}>Finance-admin review queue. Completing a request here does not itself move money; payment reconciliation and the authorized ledger workflow remain separate.</p>
        {message && <div style={{ background: "#241414", border: "1px solid #6d3737", padding: 12, borderRadius: 10 }}>{message}</div>}
        {loading ? <p>Loading…</p> : rows.length === 0 ? <p>No cashier requests.</p> : rows.map(row => (
          <article key={row.id} style={{ background: "#0d1915", border: "1px solid #20362c", borderRadius: 14, padding: 16, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>{row.request_type.toUpperCase()} · {Number(row.amount).toFixed(2)} {row.currency}</strong>
                <div style={{ color: "#82968e", fontSize: 12, marginTop: 4 }}>User {row.user_id} · {row.method} · {new Date(row.created_at).toLocaleString()}</div>
                {row.transaction_reference && <div style={{ color: "#b8cbc3", marginTop: 5 }}>Reference: {row.transaction_reference}</div>}
              </div>
              <strong style={{ color: "#d8ff32" }}>{row.status}</strong>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {(["under_review","approved","rejected","completed"] as const).map(s => (
                <button key={s} disabled={row.status === s} onClick={() => setStatus(row,s)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #365246", background: "#12221c", color: "#eef7f2" }}>{s}</button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}