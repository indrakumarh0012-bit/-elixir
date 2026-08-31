import { useState } from "react";
import { signIn, signUp } from "../lib/accounts";

const inputCls =
  "mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-500";

/**
 * Full-page sign-in / sign-up shown on opening the app, before the tools.
 * Accounts are device-local; "Continue without account" skips for this
 * session only (the page returns on the next open until signed in).
 */
export default function AuthScreen({ onGuest }: { onGuest: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const result =
      mode === "signup"
        ? await signUp("", phone, password)
        : await signIn(phone, password);
    setBusy(false);
    if (!result.ok) setErr(result.error);
    // on success the accounts store notifies App, which switches to Home
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="Pocket-Med"
        className="h-24 w-auto"
      />
      <div className="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setMode("signin"); setErr(null); }}
            className={`flex-1 rounded-lg px-3 py-2 ${mode === "signin" ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setErr(null); }}
            className={`flex-1 rounded-lg px-3 py-2 ${mode === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
          >
            Sign up
          </button>
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          inputMode="tel"
          autoComplete="tel"
          className={inputCls}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Set a password (min 6 digits)" : "Password"}
          type="password"
          inputMode="numeric"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className={inputCls}
        />
        {err && <p className="mt-2 text-sm font-semibold text-red-700">{err}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={onGuest}
          className="mt-3 w-full text-center text-sm font-semibold text-slate-600 underline"
        >
          Continue without account
        </button>
        <p className="mt-4 text-center text-[11px] leading-snug text-slate-500">
          Saved calculations stay on this device. At sign-up your phone number is shared once with the app maintainer for records.
        </p>
      </div>
    </div>
  );
}
