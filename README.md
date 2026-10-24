# BeatShare

Rate albums, compilations and EPs with your friends. BeatShare is the Music Reviews
page from LifeOS turned into its own social desktop app: everyone in the group shares
one library of releases, each member scores the releases and their tracks, and
everyone can see everyone's reviews. Built with React + Vite, wrapped in Tauri, with
Supabase for accounts, profile pictures and shared data.

- **Feed**: everyone's latest ratings and newly added releases, the group's favourites,
  and what you haven't rated yet.
- **Library**: the shared catalogue, with search, genre filters, sorting, and the Genre Map.
  Adding a release warns you if it's already on BeatShare, so there are no duplicates.
- **Release view**: your score, track-by-track ratings and notes (they save as you click),
  next to the group score, every member's review, and a per-track breakdown.
- **Members / Profiles**: profile picture, bio, stats, everything a member has rated or
  added, and how closely their taste matches yours.
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
4. Copy `.env.example` to `.env` and fill in the values from
   **Project Settings → API** (the Project URL and the `anon` public key).
5. Run `npm run dist` and send your friends the installer from
   `src-tauri/target/release/bundle/nsis/`. The keys are built into the app, so everyone
   who installs it joins the same group.

The anon key is designed to ship inside apps: what each person can do is enforced by the
row-level security rules in `schema.sql`. Members can only edit their own profile and
reviews. Anyone can fix a release's details, but only the person who added a release
can delete it.

## Project layout

```
src/
  api/          supabase.js (real backend), demo.js (local-only), index.js picks one
  data.jsx      in-memory copy of the group's data, realtime sync, batched review saves
  music.js      scoring rules (carried over from LifeOS)
  album/        release card, detail view, add/edit form, genre picker, genre map
  pages/        Feed, Library, Members, Profile, Settings, sign-in
  lifeosImport.js
src-tauri/      Tauri shell
supabase/       database schema
```
