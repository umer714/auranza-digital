"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CloudAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => setUser(data.user));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
      return () => listener.subscription.unsubscribe();
    } catch {
      setConfigured(false);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        setMessage(data.session ? "Account created. You are signed in." : "Account created. Email confirmation link check karein, phir sign in karein.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setOpen(false);
        setPassword("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error } = await getSupabaseBrowserClient().auth.signOut();
    setMessage(error?.message || "Signed out.");
  }

  if (!configured) return <div className="cloud-account"><span>Cloud account unavailable</span><small>Supabase settings check karein.</small></div>;

  return (
    <div className="cloud-account-wrap">
      {user ? (
        <div className="cloud-account">
          <span className="cloud-online" /> <span className="cloud-email">{user.email}</span>
          <span className="cloud-label">ACCOUNT CONNECTED</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      ) : (
        <>
          <button className="account-trigger" onClick={() => setOpen(!open)}>◉ Sign in / Create account</button>
          {open && <section className="account-popover">
            <div className="account-title"><span>JARVIS CLOUD</span><h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2><p>Apne account se PC aur Android par sign in kar sakein.</p></div>
            <form onSubmit={submit}>
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
              <button className="account-submit" disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}</button>
            </form>
            {message && <p className="account-message">{message}</p>}
            <button className="account-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "New here? Create an account" : "Already registered? Sign in"}</button>
            <button className="account-close" onClick={() => setOpen(false)}>Close</button>
          </section>}
        </>
      )}
    </div>
  );
}
