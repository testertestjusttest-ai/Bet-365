"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

export default function Account() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">BETNOW<span>365</span></a>
        <a className="login-btn" href="/">Home</a>
      </header>
      <div className="sports-page">
        <span className="eyebrow">ACCOUNT</span>
        <h1>My account</h1>
        <p>{email ? "Signed in as " + email : "Checking your session…"}</p>
        <div className="menu-list">
          <a className="menu-row" href="/bets"><span><b>My Bets</b><small>Open and settled bets</small></span></a>
          <a className="menu-row" href="/cashier"><span><b>Cashier</b><small>Deposit and withdrawal requests</small></span></a>
        </div>
      </div>
    </main>
  );
}
