/**
 * On-device accounts and saved calculations.
 *
 * Profiles (name + phone) and their saved entries live in this device's
 * localStorage only — nothing is sent anywhere, which keeps the app
 * offline-capable and private. Phone-number OTP sign-in requires a server
 * and an SMS provider; when one is configured this module is the seam to
 * swap in.
 */

export type Profile = {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
};

export type SavedEntry = {
  id: string;
  profileId: string;
  tool: string;
  title: string;
  detail: string;
  at: number;
};

const PROFILES_KEY = "POCKETMED_PROFILES";
const CURRENT_KEY = "POCKETMED_CURRENT_PROFILE";
const ENTRIES_KEY = "POCKETMED_SAVED";

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

function emit() {
  version++;
  for (const l of listeners) l();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVersion(): number {
  return version;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — profiles simply won't persist */
  }
}

export function getProfiles(): Profile[] {
  return read<Profile[]>(PROFILES_KEY, []);
}

export function getCurrentProfile(): Profile | null {
  const id = read<string | null>(CURRENT_KEY, null);
  return getProfiles().find((p) => p.id === id) ?? null;
}

export function createProfile(name: string, phone: string): Profile | null {
  const n = name.trim();
  const ph = phone.trim();
  if (!n || !/^[\d+][\d\s-]{7,14}$/.test(ph)) return null;
  const profiles = getProfiles();
  const existing = profiles.find((p) => p.phone === ph);
  if (existing) {
    write(CURRENT_KEY, existing.id);
    emit();
    return existing;
  }
  const profile: Profile = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: n,
    phone: ph,
    createdAt: Date.now(),
  };
  write(PROFILES_KEY, [...profiles, profile]);
  write(CURRENT_KEY, profile.id);
  emit();
  return profile;
}

export function switchProfile(id: string) {
  write(CURRENT_KEY, id);
  emit();
}

export function signOut() {
  write(CURRENT_KEY, null);
  emit();
}

export function saveCalculation(tool: string, title: string, detail: string): boolean {
  const profile = getCurrentProfile();
  if (!profile) return false;
  const entries = read<SavedEntry[]>(ENTRIES_KEY, []);
  entries.unshift({
    id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    profileId: profile.id,
    tool,
    title: title.slice(0, 120),
    detail: detail.slice(0, 2000),
    at: Date.now(),
  });
  write(ENTRIES_KEY, entries.slice(0, 500));
  emit();
  return true;
}

export function getEntries(): SavedEntry[] {
  const profile = getCurrentProfile();
  if (!profile) return [];
  return read<SavedEntry[]>(ENTRIES_KEY, []).filter((e) => e.profileId === profile.id);
}

export function deleteEntry(id: string) {
  const entries = read<SavedEntry[]>(ENTRIES_KEY, []);
  write(ENTRIES_KEY, entries.filter((e) => e.id !== id));
  emit();
}
