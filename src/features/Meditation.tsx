import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronRight,
  Flame,
  Headphones,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { db } from "../data/db";
import { displayDate } from "../domain/dates";
import {
  DAILY_MEDITATION_SECONDS,
  meditationGoalMet,
  meditationSecondsForDate,
  meditationStats,
} from "../domain/meditation";
import type { AppSettings, MeditationSession } from "../domain/types";
import {
  browseSpotify,
  connectSpotify,
  pauseSpotify,
  playSpotifyPlaylist,
  spotifyNativeAvailable,
  type SpotifyContentItem,
} from "../services/spotify";

interface Props {
  sessions: MeditationSession[];
  settings: AppSettings;
  today: string;
  entrySource: "manual" | "post_workout" | "rest_day";
  onSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onChange: () => Promise<void>;
  onBack: () => void;
}

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function Meditation({
  sessions,
  settings,
  today,
  entrySource,
  onSettings,
  onChange,
  onBack,
}: Props) {
  const [tick, setTick] = useState(Date.now()),
    [audio, setAudio] = useState<"silent" | "spotify">("silent"),
    [spotifyMessage, setSpotifyMessage] = useState(""),
    [spotifyBusy, setSpotifyBusy] = useState(false),
    [spotifyItems, setSpotifyItems] = useState<SpotifyContentItem[]>([]),
    [spotifyTrail, setSpotifyTrail] = useState<SpotifyContentItem[]>([]),
    finishing = useRef(false);
  const active = sessions.find((session) => session.state === "in_progress");
  const completedToday = meditationSecondsForDate(sessions, today),
    goalMet = meditationGoalMet(sessions, today),
    stats = meditationStats(sessions, today);
  const elapsed = active
    ? Math.min(
        active.targetSeconds,
        Math.max(
          0,
          Math.floor((tick - new Date(active.startedAt).getTime()) / 1000),
        ),
      )
    : 0;
  const remaining = active ? Math.max(0, active.targetSeconds - elapsed) : 0;
  const finish = async (
    session: MeditationSession,
    seconds: number,
    state: "partial" | "completed",
  ) => {
    if (finishing.current) return;
    finishing.current = true;
    if (session.audio === "spotify")
      await pauseSpotify().catch(() => undefined);
    await db.meditationSessions.put({
      ...session,
      endedAt: new Date().toISOString(),
      completedSeconds: Math.max(1, Math.min(session.targetSeconds, seconds)),
      state,
    });
    await onChange();
    finishing.current = false;
  };
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const now = Date.now(),
        spent = Math.max(
          0,
          Math.floor((now - new Date(active.startedAt).getTime()) / 1000),
        );
      setTick(now);
      if (spent >= active.targetSeconds)
        void finish(active, active.targetSeconds, "completed");
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [active?.id]);
  const start = async () => {
    setSpotifyMessage("");
    if (audio === "spotify") {
      if (!settings.spotifyMeditationPlaylist)
        return setSpotifyMessage("Save a meditation playlist first.");
      setSpotifyBusy(true);
      try {
        await connectSpotify();
        await playSpotifyPlaylist(settings.spotifyMeditationPlaylist);
      } catch (error) {
        setSpotifyMessage(
          error instanceof Error ? error.message : "Spotify could not start.",
        );
        setSpotifyBusy(false);
        return;
      }
      setSpotifyBusy(false);
    }
    const remainingGoal = Math.max(
        0,
        DAILY_MEDITATION_SECONDS - completedToday,
      ),
      targetSeconds = remainingGoal || DAILY_MEDITATION_SECONDS,
      now = new Date().toISOString();
    await db.meditationSessions.add({
      id: crypto.randomUUID(),
      localDate: today,
      startedAt: now,
      targetSeconds,
      completedSeconds: 0,
      state: "in_progress",
      source: entrySource,
      audio,
    });
    setTick(Date.now());
    await onChange();
  };
  const loadSpotify = async (
    item?: SpotifyContentItem,
    trail = spotifyTrail,
  ) => {
    setSpotifyBusy(true);
    setSpotifyMessage("");
    try {
      await connectSpotify();
      const result = await browseSpotify(item);
      setSpotifyItems(result.items);
      setSpotifyTrail(trail);
      if (!result.items.length)
        setSpotifyMessage(
          "Nothing appeared here. Try another Spotify section.",
        );
    } catch (error) {
      setSpotifyMessage(
        error instanceof Error ? error.message : "Spotify could not open.",
      );
    } finally {
      setSpotifyBusy(false);
    }
  };
  const openSpotifyItem = (item: SpotifyContentItem) =>
    item.hasChildren
      ? loadSpotify(item, [...spotifyTrail, item])
      : item.playable
        ? playSpotifyPlaylist(item.uri)
        : undefined;
  const choosePlaylist = async (
    kind: "meditation" | "workout",
    item: SpotifyContentItem,
  ) => {
    await onSettings(
      kind === "meditation"
        ? { spotifyMeditationPlaylist: item.uri }
        : { spotifyWorkoutPlaylist: item.uri },
    );
    setSpotifyMessage(
      `${item.title} saved for ${kind === "meditation" ? "meditation" : "workouts"}.`,
    );
  };
  const history = useMemo(
    () =>
      sessions
        .filter((s) => s.completedSeconds > 0)
        .slice()
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 10),
    [sessions],
  );
  if (active) {
    const breathPhase =
        elapsed % 10 < 4 ? "Breathe in gently" : "Breathe out slowly",
      progress = Math.min(100, (elapsed / active.targetSeconds) * 100);
    return (
      <div className="meditation-focus">
        <div className="meditation-focus-inner">
          <p className="eyebrow">DAILY MEDITATION</p>
          <div
            className={`breathing-orb ${elapsed % 10 < 4 ? "inhale" : "exhale"}`}
            style={
              { "--meditation-progress": `${progress}%` } as React.CSSProperties
            }
          >
            <Brain />
            <strong>{clock(remaining)}</strong>
            <span>{breathPhase}</span>
          </div>
          <h1>Stay with this moment.</h1>
          <p>
            Let thoughts pass without judging them. Return gently to your
            breathing whenever your attention wanders.
          </p>
          <button
            className="meditation-end"
            onClick={() => finish(active, elapsed, "partial")}
          >
            <Pause />
            Finish early and save
          </button>
          <small>
            Your progress is based on elapsed time, so briefly locking your
            phone will not reset the session.
          </small>
        </div>
      </div>
    );
  }
  return (
    <div className="page meditation-page">
      <div className="page-head">
        <button className="icon-btn" aria-label="Go back" onClick={onBack}>
          <ArrowLeft />
        </button>
        <b>Meditation</b>
        <span />
      </div>
      <section className={`meditation-hero ${goalMet ? "complete" : ""}`}>
        <div className="meditation-symbol">
          {goalMet ? <Check /> : <Brain />}
        </div>
        <p className="eyebrow">
          {goalMet ? "TODAY COMPLETE" : "YOUR DAILY RESET"}
        </p>
        <h1>{goalMet ? "You made space today." : "Ten quiet minutes."}</h1>
        <p>
          {goalMet
            ? `${Math.floor(completedToday / 60)} minutes recorded for ${displayDate(today)}.`
            : "A simple session that works silently offline, with Spotify available as optional audio."}
        </p>
        <div className="meditation-audio-choice">
          <button
            className={audio === "silent" ? "selected" : ""}
            onClick={() => setAudio("silent")}
          >
            <ShieldCheck />
            Silent
          </button>
          <button
            className={audio === "spotify" ? "selected" : ""}
            disabled={!settings.spotifyMeditationPlaylist}
            onClick={() => setAudio("spotify")}
          >
            <Headphones />
            Spotify
          </button>
        </div>
        <button
          className="primary light"
          disabled={spotifyBusy}
          onClick={start}
        >
          <Play />
          {spotifyBusy
            ? "Connecting…"
            : goalMet
              ? "Meditate again"
              : entrySource === "post_workout"
                ? "Start after-workout meditation"
                : "Start 10-minute meditation"}
        </button>
        {spotifyMessage && (
          <small className="spotify-message">{spotifyMessage}</small>
        )}
      </section>
      <div className="meditation-stats">
        <article>
          <Flame />
          <strong>{stats.currentStreak}</strong>
          <span>day streak</span>
        </article>
        <article>
          <TimerReset />
          <strong>{stats.sevenDayMinutes}</strong>
          <span>minutes · 7 days</span>
        </article>
        <article>
          <Sparkles />
          <strong>{stats.totalSessions}</strong>
          <span>sessions</span>
        </article>
      </div>
      <section className="card meditation-method">
        <div className="section-title">
          <span>
            <ShieldCheck />
            Today’s method
          </span>
          <span className="status success">Offline</span>
        </div>
        <ol>
          <li>Get comfortable and let your shoulders relax.</li>
          <li>Notice your natural breath without forcing it.</li>
          <li>When attention wanders, return without judging yourself.</li>
        </ol>
        <p className="helper">
          The breathing cue is optional guidance, not a breathing challenge.
          Breathe normally and stop if you feel uncomfortable.
        </p>
      </section>
      <section className="card spotify-ready">
        <Headphones />
        <div>
          <b>Spotify</b>
          <p>
            Browse and choose inside FitQuest. Playback stays in the Spotify
            app.
          </p>
        </div>
        <span className={`status ${spotifyNativeAvailable() ? "success" : ""}`}>
          {spotifyNativeAvailable() ? "Ready" : "APK only"}
        </span>
        <div className="spotify-browser">
          <div className="spotify-current">
            <span>
              <small>Meditation</small>
              <b>
                {settings.spotifyMeditationPlaylist
                  ? "Selected"
                  : "Not selected"}
              </b>
            </span>
            <span>
              <small>Gym</small>
              <b>
                {settings.spotifyWorkoutPlaylist ? "Selected" : "Not selected"}
              </b>
            </span>
          </div>
          {spotifyItems.length === 0 ? (
            <button
              className="primary full"
              disabled={!spotifyNativeAvailable() || spotifyBusy}
              onClick={() => loadSpotify(undefined, [])}
            >
              {spotifyBusy ? "Opening Spotify…" : "Browse my Spotify"}
            </button>
          ) : (
            <>
              <div className="spotify-browser-head">
                <button
                  className="secondary"
                  disabled={!spotifyTrail.length}
                  onClick={() => {
                    const next = spotifyTrail.slice(0, -1),
                      parent = next.at(-1);
                    void loadSpotify(parent, next);
                  }}
                >
                  Back
                </button>
                <b>{spotifyTrail.at(-1)?.title || "Your Spotify"}</b>
              </div>
              <div className="spotify-item-list">
                {spotifyItems.map((item) => (
                  <article key={`${item.id}-${item.uri}`}>
                    <button
                      className="spotify-item-main"
                      onClick={() => openSpotifyItem(item)}
                    >
                          {item.imageUri.startsWith('http') ? (
                        <img src={item.imageUri} alt="" />
                      ) : (
                        <Headphones />
                      )}
                      <span>
                        <b>{item.title}</b>
                        <small>{item.subtitle}</small>
                      </span>
                      {item.hasChildren ? <ChevronRight /> : <Play />}
                    </button>
                    {item.playable && (
                      <div>
                        <button
                          onClick={() => choosePlaylist("meditation", item)}
                        >
                          Use for Mind
                        </button>
                        <button onClick={() => choosePlaylist("workout", item)}>
                          Use for Gym
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          {spotifyMessage && (
            <p className="spotify-message">{spotifyMessage}</p>
          )}
        </div>
      </section>
      <section className="card">
        <div className="section-title">
          <span>Meditation history</span>
          <span className="status">Best · {stats.longestStreak} days</span>
        </div>
        {history.length ? (
          history.map((session) => (
            <div className="meditation-history" key={session.id}>
              <span className={session.state === "completed" ? "complete" : ""}>
                {session.state === "completed" ? <Check /> : <TimerReset />}
              </span>
              <div>
                <b>{displayDate(session.localDate)}</b>
                <small>
                  {Math.max(1, Math.floor(session.completedSeconds / 60))} min ·{" "}
                  {session.source.replace("_", " ")}
                </small>
              </div>
              <em>{session.state}</em>
            </div>
          ))
        ) : (
          <p className="helper">
            Your first completed or partial session will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
