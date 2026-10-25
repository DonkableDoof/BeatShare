import { createClient } from "@supabase/supabase-js";

/* The real backend. Every table is small enough for a group of friends
   that the app loads all of it at sign-in and keeps it current through
   realtime, rather than paging. */

const TABLES = ["profiles", "genres", "albums", "reviews", "recommendations"];

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

    async inviteAvailable(code) {
      return must(await sb.rpc("invite_available", { invite: code }));
    },

    /* returns the signed-in user, or null when the project wants the
       email confirmed first. The database turns the sign-up down unless
       the invite code is unused. */
    async signUp({ email, password, username, displayName, inviteCode }) {
      const data = must(
        await sb.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: displayName, invite_code: inviteCode } },
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
      /* recommendations come back already limited to the ones you sent or got */
      const [profiles, genres, albums, reviews, recommendations] = await Promise.all(TABLES.map(selectAll));
      return { profiles, genres, albums, reviews, recommendations };
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

    /* only admins can see or make invite codes */
    async listInvites() {
      return must(await sb.from("invites").select("*").order("created_at", { ascending: false }));
    },
    async createInvite(userId) {
      return must(await sb.from("invites").insert({ created_by: userId }).select().single());
    },
    async deleteInvite(code) {
      must(await sb.from("invites").delete().eq("code", code));
    },

    async updateProfile(id, patch) {
      return must(await sb.from("profiles").update(patch).eq("id", id).select().single());
    },

    async uploadImage(bucket, userId, blob) {
      const ext = { "image/png": "png", "image/gif": "gif", "image/webp": "webp" }[blob.type] || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
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
    async insertRecommendations(rows) {
      return must(await sb.from("recommendations").insert(rows).select());
    },
    async markRecommendationsRead(ids) {
      return must(await sb.from("recommendations").update({ read_at: new Date().toISOString() }).in("id", ids).select());
    },
    async deleteRecommendation(id) {
      must(await sb.from("recommendations").delete().eq("id", id));
    },

    async deleteReview(albumId, userId) {
      must(await sb.from("reviews").delete().eq("album_id", albumId).eq("user_id", userId));
    },
  };
}
