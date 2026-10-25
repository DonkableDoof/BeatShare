# BeatShare

Rate albums, compilations and EPs with your friends. BeatShare is the Music Reviews
page from LifeOS turned into its own social desktop app: everyone in the group shares
one library of releases, each member scores the releases and their tracks, and
everyone can see everyone's reviews. Built with React + Vite, wrapped in Tauri, with
Supabase for accounts, profile pictures and shared data.

- **Feed**: everyone's latest ratings and newly added releases, the group's favourites,
  and what you haven't rated yet.
- **Library**: the shared catalogue, with search, genre filters and sorting. Adding a
  release warns you if it's already on BeatShare, so there are no duplicates. Each release
  can carry a link (Spotify, Apple Music, Bandcamp…) that opens in your browser.
- **Release view**: your score, track-by-track ratings and notes (they save as you click),
  next to the group score, every member's review, and a per-track breakdown.
- **Inbox**: recommend a release to other members (right-click it, or ➤ Recommend on its
  page) with an optional note; it lands in their inbox.
- **Right-click a release** to recommend it, or, if you added it, to edit or delete it.
  Only whoever added a release (or an admin) can change it.
- **Members / Profiles**: profile picture, stats, top 3 genres, everything a member has
  rated or added, and how closely their taste matches yours.
- **Invite-only**: creating an account needs an unused invite code, and only the admin
  can make them (Settings → Invite Codes).
- **Import from LifeOS** (Settings): brings your existing LifeOS music reviews across.

Scores work the same as in LifeOS: stars in halves, shown out of 10.

## Run it

```bash
npm install
npm run app        # desktop app in dev mode (Tauri)
npm run dev        # just the web UI at http://localhost:1430
npm run dist       # build the Windows installer into src-tauri/target/release/bundle
```

Without Supabase keys, BeatShare runs in **demo mode**: accounts and reviews are kept
on this computer only, which is handy for trying it out but isn't shared with anyone.

## Connect Supabase (to share with friends)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, open **SQL Editor → New query**, paste all of
   [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the tables,
   the security rules, the `avatars` and `covers` image buckets, and realtime updates.
3. Open **Authentication → Sign In / Providers → Email** and turn **Confirm email** off.
   For a group of friends that's simplest; if you leave it on, people confirm by email
   before their first sign-in.
4. Make the first invite code: in the SQL Editor run
   `insert into public.invites (makes_admin) values (true) returning code;`.
   Sign up with that code and your account becomes the admin, who makes codes for
   everyone else under **Settings → Invite Codes**.
5. Copy `.env.example` to `.env` and fill in the values from
   **Project Settings → API** (the Project URL and the `anon` public key).
6. Run `npm run dist` and send your friends the installer from
   `src-tauri/target/release/bundle/nsis/`, each with their own invite code. The keys are
   built into the app, so everyone who installs it joins the same group, but nobody can
   sign up without a code, so a leaked installer is useless on its own.

The anon key is designed to ship inside apps: what each person can do is enforced by the
row-level security rules in `schema.sql`. Members can only edit their own profile and
reviews. Only the person who added a release, or an admin, can edit or delete it.

## Project layout

```
src/
  api/          supabase.js (real backend), demo.js (local-only), index.js picks one
  data.jsx      in-memory copy of the group's data, realtime sync, batched review saves
  music.js      scoring rules (carried over from LifeOS)
  album/        release card, detail view, add/edit form, genre picker
  pages/        Feed, Library, Members, Profile, Settings, sign-in
  lifeosImport.js
src-tauri/      Tauri shell
supabase/       database schema
```
