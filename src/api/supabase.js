import { createClient } from "@supabase/supabase-js";

/* The real backend. Every table is small enough for a group of friends
   that the app loads all of it at sign-in and keeps it current through
   realtime, rather than paging. */

const TABLES = ["profiles", "genres", "albums", "reviews"];

export function createSupabaseApi(url, key) {
  const sb = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  const must = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  const sessionUser = (session) => (session && session.user ? { id: session.user.id, email: session.user.email } : null);

  /* Supabase hands back at most 1000 rows a request, so read in pages */
  const PAGE = 1000;
  const ORDER = { reviews: "album_id" };
  const selectAll = async (table) => {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      let q = sb.from(table).select("*").order(ORDER[table] || "id");
      if (table === "reviews") q = q.order("user_id");
      const page = must(await q.range(from, from + PAGE - 1));
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  };

  return {
    mode: "supabase",

    async getUser() {
      const { data } = await sb.auth.getSession();
      return sessionUser(data.session);
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(sessionUser(session)));
      return () => data.subscription.unsubscribe();
    },

    async usernameAvailable(name) {
      return must(await sb.rpc("username_available", { name }));
    },

    /* returns the signed-in user, or null when the project wants the
       email confirmed first */
    async signUp({ email, password, username, displayName }) {
      const data = must(
        await sb.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: displayName } },
        })
      );
      return sessionUser(data.session);
    },

    async signIn({ email, password }) {
      const data = must(await sb.auth.signInWithPassword({ email, password }));
      return sessionUser(data.session);
    },

    async signOut() {
      must(await sb.auth.signOut());
    },

    async loadAll() {
      const [profiles, genres, albums, reviews] = await Promise.all(TABLES.map(selectAll));
      return { profiles, genres, albums, reviews };
    },

    subscribe(onChange) {
      const channel = sb.channel("beatshare-db");
      TABLES.forEach((table) =>
        channel.on("postgres_changes", { event: "*", schema: "public", table }, (p) =>
          onChange(table, p.eventType, p.new, p.old)
        )
      );
      channel.subscribe();
      return () => sb.removeChannel(channel);
    },

    async updateProfile(id, patch) {
      return must(await sb.from("profiles").update(patch).eq("id", id).select().single());
    },

    async uploadImage(bucket, userId, blob) {
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      must(await sb.storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false }));
      return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    },

    async insertAlbum(row) {
      return must(await sb.from("albums").insert(row).select().single());
    },
    async updateAlbum(id, patch) {
      return must(await sb.from("albums").update(patch).eq("id", id).select().single());
    },
    async deleteAlbum(id) {
      must(await sb.from("albums").delete().eq("id", id));
    },

    async insertGenre(row) {
      return must(await sb.from("genres").insert(row).select().single());
    },
    async updateGenre(id, patch) {
      return must(await sb.from("genres").update(patch).eq("id", id).select().single());
    },
    async deleteGenre(id) {
      must(await sb.from("genres").delete().eq("id", id));
    },

    async upsertReview(row) {
      return must(await sb.from("reviews").upsert(row, { onConflict: "album_id,user_id" }).select().single());
    },
    async deleteReview(albumId, userId) {
      must(await sb.from("reviews").delete().eq("album_id", albumId).eq("user_id", userId));
    },
  };
}
