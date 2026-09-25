"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

type DemoBet = {id?: string; betType?: string; selections?: Array<{event?: string; label?: string; odd?: number|string}>; stake?: number; potentialReturn?: number; createdAt?: string;
  status?: string;
  date?: string;
  event?: string;
  odd?: number | string;
};

export default function Bets() {
  const [items, setItems] = useState<DemoBet[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) =>
      setUserEmail(data.session?.user?.email || null)
    );
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUserEmail(session?.user?.email || null)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("betnow365-demo-bets") || "[]";
      setItems(JSON.parse(raw));
    } catch {
      setItems([]);
    }
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          BETNOW<span>365</span>
        </a>
        {userEmail ? (
          <a className="login-btn" href="/account">Account</a>
        ) : (
          <a className="login-btn" href="/login?next=/bets">Log in</a>
        )}
      </header>

      <div className="sports-page">
        <h1>My Bets</h1>
        <p>
          Open, settled and cashed-out bets will appear here after
          authenticated bet placement is enabled.
        </p>

        {items.length === 0 ? (
          <div className="loading-card">
            {userEmail
              ? "No settled or open bets are available in this view yet."
              : "No bets yet. Select odds from Sports and log in to continue."}
          </div>
        ) : (
          items.map((item, index) => (
            <div className="match-card" key={index}>
              <div className="match-meta">
                <span>{item.status === "demo_accepted" ? "Demo accepted" : (item.status || "Open")}</span>
                <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : (item.date || "")}</span>
              </div>
              <div className="teams">
                <b>{item.betType === "multiple" ? "Multiple bet" : "Single bet"}</b>
                <b>{Number(item.stake || 0).toFixed(2)}</b>
              </div>
              {(item.selections || []).map((s, i) => <div className="match-meta" key={i}><span>{s.event || "Event"} · {s.label || "Selection"}</span><strong>{Number(s.odd || 0).toFixed(2)}</strong></div>)}
              <div className="market-row"><span>Potential return</span><strong>{Number(item.potentialReturn || 0).toFixed(2)}</strong></div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
