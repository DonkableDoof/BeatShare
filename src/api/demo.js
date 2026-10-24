/* Local demo backend — used when no Supabase keys are set. Same shape as
   the Supabase api, but everything lives in this computer's localStorage,
   so several "members" can be tried out on one machine (sign out, sign up
   as someone else). Nothing is shared with anyone. */

const DB_KEY = "bs-demo-db";
const SESSION_KEY = "bs-demo-session";

const blank = () => ({ users: [], profiles: [], genres: [], albums: [], reviews: [] });

function read() {
  try {
    return { ...blank(), ...(JSON.parse(localStorage.getItem(DB_KEY)) || {}) };
  } catch {
    return blank();
  }
}

function write(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    throw new Error("This computer's demo storage is full — images take the most room.");
  }
}

const now = () => new Date().toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));
const norm = (s) => String(s || "").trim().toLowerCase();

const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });

export function createDemoApi() {
  const authSubs = new Set();
  let current = null;
  try {
    current = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {}

  const setUser = (user) => {
    current = user;
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
    authSubs.forEach((cb) => cb(user));
  };

  const me = () => {
    if (!current) throw new Error("Not signed in.");
    return current.id;
  };

  const releaseTaken = (db, row, exceptId) =>
    db.albums.some((a) => a.id !== exceptId && norm(a.artist) === norm(row.artist) && norm(a.title) === norm(row.title));

  return {
    mode: "demo",

    async getUser() {
      return current;
    },

    onAuthChange(cb) {
      authSubs.add(cb);
      return () => authSubs.delete(cb);
    },

    async usernameAvailable(name) {
      return !read().profiles.some((p) => p.username === norm(name));
    },

    async signUp({ email, password, username, displayName }) {
      const db = read();
      if (db.users.some((u) => u.email === norm(email))) throw new Error("User already registered");
      if (db.profiles.some((p) => p.username === norm(username))) throw new Error("That username is taken.");
      const id = crypto.randomUUID();
      db.users.push({ id, email: norm(email), password });
      db.profiles.push({
        id,
        username: norm(username),
        display_name: (displayName || "").trim() || username,
        avatar_url: "",
        bio: "",
        created_at: now(),
      });
      write(db);
      const user = { id, email: norm(email) };
      setUser(user);
      return user;
    },

    async signIn({ email, password }) {
      const u = read().users.find((x) => x.email === norm(email) && x.password === password);
      if (!u) throw new Error("Invalid login credentials");
      const user = { id: u.id, email: u.email };
      setUser(user);
      return user;
    },

    async signOut() {
      setUser(null);
    },

    async loadAll() {
      const { profiles, genres, albums, reviews } = read();
      return clone({ profiles, genres, albums, reviews });
    },

    /* another window of the app changing the demo data reloads this one */
    subscribe(onChange) {
      const onStorage = (e) => e.key === DB_KEY && onChange("*", "RELOAD");
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },

    async updateProfile(id, patch) {
      if (id !== me()) throw new Error("You can only edit your own profile.");
      const db = read();
      if (patch.username && db.profiles.some((p) => p.id !== id && p.username === norm(patch.username)))
        throw new Error("That username is taken.");
      db.profiles = db.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
      write(db);
      return clone(db.profiles.find((p) => p.id === id));
    },

    async uploadImage(_bucket, _userId, blob) {
      return blobToDataUrl(blob);
    },

    async insertAlbum(row) {
      const db = read();
      if (releaseTaken(db, row)) throw new Error('duplicate key value violates unique constraint "albums_release_key"');
      const rec = { ...row, created_by: me(), created_at: now(), updated_at: now() };
      db.albums.push(rec);
      write(db);
      return clone(rec);
    },
    async updateAlbum(id, patch) {
      const db = read();
      const old = db.albums.find((a) => a.id === id);
      if (!old) throw new Error("That release no longer exists.");
      if (releaseTaken(db, { ...old, ...patch }, id))
        throw new Error('duplicate key value violates unique constraint "albums_release_key"');
      const rec = { ...old, ...patch, created_by: old.created_by, created_at: old.created_at, updated_at: now() };
      db.albums = db.albums.map((a) => (a.id === id ? rec : a));
      write(db);
      return clone(rec);
    },
    async deleteAlbum(id) {
      const db = read();
      const a = db.albums.find((x) => x.id === id);
      if (a && a.created_by !== me()) throw new Error("Only the member who added a release can delete it.");
      db.albums = db.albums.filter((x) => x.id !== id);
      db.reviews = db.reviews.filter((r) => r.album_id !== id);
      write(db);
    },

    async insertGenre(row) {
      const db = read();
      if (db.genres.some((g) => norm(g.name) === norm(row.name)))
        throw new Error('duplicate key value violates unique constraint "genres_name_key"');
      const rec = { ...row, created_by: me(), created_at: now() };
      db.genres.push(rec);
      write(db);
      return clone(rec);
    },
    async updateGenre(id, patch) {
      const db = read();
      db.genres = db.genres.map((g) => (g.id === id ? { ...g, ...patch } : g));
      write(db);
      return clone(db.genres.find((g) => g.id === id));
    },
    async deleteGenre(id) {
      const db = read();
      db.genres = db.genres.filter((g) => g.id !== id);
      write(db);
    },

    async upsertReview(row) {
      if (row.user_id !== me()) throw new Error("You can only edit your own reviews.");
      const db = read();
      const old = db.reviews.find((r) => r.album_id === row.album_id && r.user_id === row.user_id);
      const rec = old ? { ...old, ...row, updated_at: now() } : { ...row, created_at: now(), updated_at: now() };
      db.reviews = old ? db.reviews.map((r) => (r === old ? rec : r)) : [...db.reviews, rec];
      write(db);
      return clone(rec);
    },
    async deleteReview(albumId, userId) {
      if (userId !== me()) throw new Error("You can only edit your own reviews.");
      const db = read();
      db.reviews = db.reviews.filter((r) => !(r.album_id === albumId && r.user_id === userId));
      write(db);
    },
  };
}
