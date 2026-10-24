import React, { createContext, useContext, useMemo, useState } from "react";
import { useTheme } from "../theme";
import { ui } from "../ui";
import { useData } from "../data.jsx";
import { genresOf, hasVerdict, typeLabel } from "../music";
import Popup from "../components/Popup.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import AlbumDetail from "./AlbumDetail.jsx";
import AlbumForm, { blankAlbum } from "./AlbumForm.jsx";
import { GenreManager } from "./Genres.jsx";

/* Release popups live above every page, so the feed, a profile and the
   library can all open the same release the same way. */

const HostCtx = createContext(null);
export const useAlbums = () => useContext(HostCtx);

export function AlbumHost({ onOpenProfile, notify, children }) {
  const t = useTheme();
  const s = ui(t);
  const d = useData();
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [manageGenres, setManageGenres] = useState(false);

  const album = open ? d.albumById[open.id] : null;

  const genreCounts = useMemo(() => {
    const c = {};
    d.albums.forEach((a) => (a.genres || []).forEach((id) => (c[id] = (c[id] || 0) + 1)));
    return c;
  }, [d.albums]);

  const actions = {
    openAlbum: (id, tab) => setOpen({ id, tab }),
    newAlbum: () => setForm({ mode: "create", album: blankAlbum() }),
    manageGenres: () => setManageGenres(true),
    busy: !!(open || form || confirm || manageGenres),
  };

  const rate = (fn) => album && d.patchMyReview(album.id, fn);

  const save = async (a) => {
    const created = form.mode === "create";
    await d.saveAlbum(a, created);
    setForm(null);
    /* straight into rating a release you've just added */
    if (created) setOpen({ id: a.id, tab: "mine" });
    notify(created ? `${typeLabel(a.type)} added — everyone can see it now.` : "Release updated.");
  };

  const askDelete = () => {
    const others = (d.reviewsByAlbum[album.id] || []).filter((r) => r.user_id !== d.userId && hasVerdict(album, r)).length;
    setConfirm({
      title: "Delete Release",
      confirmLabel: "Delete For Everyone",
      message: `"${album.title}" will be removed from BeatShare for the whole group${
        others ? `, along with ${others} other member${others === 1 ? "'s" : "s'"} review${others === 1 ? "" : "s"}` : ""
      }. This can't be undone.`,
      action: async () => {
        const id = album.id;
        setOpen(null);
        try {
          await d.deleteAlbum(id);
          notify("Release deleted.");
        } catch (e) {
          notify(d.friendly(e), "error");
        }
      },
    });
  };

  const askClear = () =>
    setConfirm({
      title: "Clear Your Review",
      confirmLabel: "Clear Review",
      message: `Your score, track ratings and notes for "${album.title}" will be removed.`,
      action: () => d.clearMyReview(album.id),
    });

  return (
    <HostCtx.Provider value={actions}>
      {children}

      <Popup show={!!album && !form}>
        {album && (
          <AlbumDetail
            key={album.id}
            t={t}
            s={s}
            album={album}
            genres={genresOf(album, d.genreById)}
            reviews={d.reviewsByAlbum[album.id] || []}
            myReview={d.myReviews[album.id]}
            userId={d.userId}
            profileById={d.profileById}
            initialTab={open.tab || "mine"}
            blocked={!!confirm}
            onClose={() => setOpen(null)}
            onRateAlbum={(v) => rate((r) => ({ ...r, rating: v }))}
            onRateTrack={(trackId, v) =>
              rate((r) => {
                const tr = { ...(r.track_ratings || {}) };
                if (v > 0) tr[trackId] = v;
                else delete tr[trackId];
                return { ...r, track_ratings: tr };
              })
            }
            onInterlude={(trackId, on) =>
              d.patchAlbum(album.id, {
                tracks: (album.tracks || []).map((tr) => (tr.id === trackId ? { ...tr, interlude: on } : tr)),
              })
            }
            onNotes={(notes) => rate((r) => ({ ...r, notes }))}
            onEdit={() => setForm({ mode: "edit", album })}
            onDelete={askDelete}
            onClearReview={askClear}
            onOpenProfile={(id) => {
              setOpen(null);
              onOpenProfile(id);
            }}
          />
        )}
      </Popup>

      <Popup show={!!form}>
        {form && (
          <AlbumForm
            t={t}
            s={s}
            mode={form.mode}
            initial={form.album}
            albums={d.albums}
            profileById={d.profileById}
            genres={d.genres}
            onCreateGenre={d.createGenre}
            onCancel={() => setForm(null)}
            onSave={save}
            onOpenExisting={(id) => {
              setForm(null);
              setOpen({ id, tab: "mine" });
            }}
          />
        )}
      </Popup>

      <Popup show={manageGenres}>
        {manageGenres && (
          <GenreManager
            t={t}
            s={s}
            genres={d.genres}
            counts={genreCounts}
            blocked={!!confirm}
            onCreate={d.createGenre}
            onUpdate={d.updateGenre}
            onDelete={(g) => {
              const n = genreCounts[g.id] || 0;
              if (!n) return d.deleteGenre(g.id);
              setConfirm({
                title: "Delete Genre",
                confirmLabel: "Delete Genre",
                message: `"${g.name}" will be removed from ${n} release${n === 1 ? "" : "s"} for everyone in the group.`,
                action: () => d.deleteGenre(g.id),
              });
            }}
            onClose={() => setManageGenres(false)}
          />
        )}
      </Popup>

      <Popup show={!!confirm}>
        {confirm && (
          <ConfirmDialog
            title={confirm.title}
            message={confirm.message}
            confirmLabel={confirm.confirmLabel}
            danger
            onConfirm={() => {
              confirm.action();
              setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
          />
        )}
      </Popup>
    </HostCtx.Provider>
  );
}
