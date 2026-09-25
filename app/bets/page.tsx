"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

type DemoBet = {
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
                <span>{item.status || "Open"}</span>
                <span>{item.date || ""}</span>
              </div>
              <div className="teams">
                <b>{item.event || "Event"}</b>
                <b>{item.odd ?? "—"}</b>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
