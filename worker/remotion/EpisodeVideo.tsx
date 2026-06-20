import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const anton = loadAnton().fontFamily;
const inter = loadInter().fontFamily;
const BG = "#05060A", GOLD = "#E9B84A", GOLDH = "#FFD56A", ICE = "#7FB2FF", WHITE = "#F4F1E8";

type Beat = { narr: string; visual: string; desc?: string };

export const calcMeta = async ({ props }: any) => {
  const fps = 30, lead = 45, tail = 40;
  let dur = 40;
  try { if (props.narrationUrl) dur = await getAudioDurationInSeconds(props.narrationUrl); } catch (_) {}
  const sped = dur / 1.18; // ritmo aprovado da skill (atempo 1.18)
  return { durationInFrames: Math.round(lead + sped * fps + tail) };
};

function beatsFrom(props: any): Beat[] {
  if (Array.isArray(props.storyboard) && props.storyboard.length) {
    return props.storyboard.map((b: any) => ({ narr: String(b.narr ?? ""), visual: String(b.visual ?? "vetor"), desc: b.desc }));
  }
  const parts = String(props.script ?? "").split("[CORTE]").map((x: string) => x.trim()).filter(Boolean);
  const cycle = ["video", "vetor", "imagem", "vetor"];
  return parts.map((narr: string, i: number) => ({ narr, visual: i === 0 ? "video" : cycle[i % cycle.length] }));
}

function bar(f: number, k: number) { return Math.min(1, Math.max(0, (f - k * 4) / 18)); }

const Grain: React.FC = () => (<AbsoluteFill style={{ background: "radial-gradient(140% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />);

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 7], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 7], [24, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", padding: "0 64px 230px" }}>
      <div style={{ fontFamily: inter, fontWeight: 800, color: WHITE, fontSize: 60, textAlign: "center", lineHeight: 1.12, opacity: o, transform: `translateY(${y}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>{text}</div>
    </AbsoluteFill>
  );
};

const VideoScene: React.FC<{ i: number; src?: string }> = ({ i, src }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 120], [1.12, 1.26]);
  const a = (i * 47) % 360;
  if (src) {
    return (
      <AbsoluteFill style={{ transform: `scale(${s})`, background: BG }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <Grain />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ transform: `scale(${s})` }}>
      <AbsoluteFill style={{ background: `linear-gradient(${a}deg, #0a1622, #05060A 60%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(60% 50% at ${30 + (i * 13) % 40}% 35%, ${GOLD}33, transparent 60%), radial-gradient(50% 50% at 75% 70%, ${ICE}22, transparent 55%)` }} />
      <Grain />
    </AbsoluteFill>
  );
};

const ImageScene: React.FC<{ i: number; src?: string }> = ({ i, src }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 130], [1.08, 1.2]);
  const tx = interpolate(f, [0, 130], [-20, 20]);
  return (
    <AbsoluteFill style={{ background: BG }}>
      {src ? (
        <AbsoluteFill style={{ transform: `scale(${s}) translateX(${tx}px)` }}><Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ transform: `scale(${s}) translateX(${tx}px)`, background: "linear-gradient(135deg, #16202e, #0b0e14)" }} />
      )}
      <AbsoluteFill style={{ background: `radial-gradient(70% 50% at 50% 30%, ${GOLD}22, transparent 60%)` }} />
      <Grain />
    </AbsoluteFill>
  );
};

const VetorScene: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const r = (f * 1.2) % 360;
  const pulse = 1 + 0.06 * Math.sin(f / 8);
  const variant = i % 3;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% -10%, #0c1420, ${BG})`, alignItems: "center", justifyContent: "center" }}>
      {variant === 0 && (
        <svg width="760" height="760" viewBox="0 0 760 760" style={{ transform: `scale(${pulse})`, opacity: 0.9 }}>
          <circle cx="380" cy="380" r="300" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.5" />
          <circle cx="380" cy="380" r="220" fill="none" stroke={GOLD} strokeWidth="3" />
          <g transform={`rotate(${r} 380 380)`}><line x1="380" y1="80" x2="380" y2="680" stroke={GOLDH} strokeWidth="3" /><line x1="80" y1="380" x2="680" y2="380" stroke={ICE} strokeWidth="2" opacity="0.6" /></g>
        </svg>
      )}
      {variant === 1 && (
        <svg width="820" height="500" viewBox="0 0 820 500" style={{ opacity: 0.95 }}>
          {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={70 + k * 150} y={400 - (60 + k * 55) * bar(f, k)} width="90" height={(60 + k * 55) * bar(f, k)} fill={k % 2 ? ICE : GOLD} rx="8" />)}
        </svg>
      )}
      {variant === 2 && (
        <svg width="760" height="760" viewBox="0 0 760 760" style={{ transform: `rotate(${r / 3}deg)` }}>
          <polygon points="380,90 600,250 520,560 240,560 160,250" fill="none" stroke={GOLD} strokeWidth="3" />
          <circle cx="380" cy="380" r="60" fill={GOLD} opacity={0.5 + 0.3 * Math.sin(f / 6)} />
        </svg>
      )}
      <Grain />
    </AbsoluteFill>
  );
};

const Slam: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const s = spring({ frame: f, fps: 30, config: { damping: 120, stiffness: 200 } });
  return (
    <AbsoluteFill style={{ background: BG, alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: anton, color: GOLD, fontSize: 150, textAlign: "center", textTransform: "uppercase", transform: `scale(${0.8 + 0.2 * s})`, letterSpacing: -2 }}>{text}</div>
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, 38, 50], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70, opacity: o }}>
      <div style={{ fontFamily: anton, color: GOLDH, fontSize: 92, textAlign: "center", lineHeight: 1.02, textTransform: "uppercase", textShadow: `0 0 40px ${GOLD}88` }}>{text}</div>
    </AbsoluteFill>
  );
};

const CTA: React.FC<{ question?: string }> = ({ question }) => {
  const f = useCurrentFrame();
  const s = spring({ frame: f, fps: 30, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: BG, alignItems: "center", justifyContent: "center", padding: "0 70px", transform: `scale(${0.92 + 0.08 * s})` }}>
      <div style={{ width: 110, height: 110, borderRadius: "50%", border: `4px solid ${GOLD}`, marginBottom: 26, display: "grid", placeItems: "center", color: GOLD, fontFamily: anton, fontSize: 56 }}>✦</div>
      {question ? <div style={{ fontFamily: anton, color: WHITE, fontSize: 56, textAlign: "center", lineHeight: 1.08, textTransform: "uppercase", marginBottom: 22, textShadow: `0 0 30px ${GOLD}55` }}>{question}</div> : <div style={{ fontFamily: anton, color: WHITE, fontSize: 64, textTransform: "uppercase" }}>Viagem ao Passado</div>}
      <div style={{ fontFamily: anton, color: GOLD, fontSize: 50 }}>+ SEGUIR</div>
    </AbsoluteFill>
  );
};

const CueCaptions: React.FC<{ cues: any[]; lead: number; fps: number }> = ({ cues, lead, fps }) => {
  const f = useCurrentFrame();
  const t = ((f - lead) / fps) * 1.18; // tempo no audio cru (atempo 1.18)
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const words = String(cue.text).split(" ").filter(Boolean);
  let ki = 0; for (let i = 1; i < words.length; i++) { if (words[i].length > words[ki].length) ki = i; }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", padding: "0 64px 230px" }}>
      <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 60, textAlign: "center", lineHeight: 1.12, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>
        {words.map((w, i) => (<span key={i} style={{ color: i === ki ? GOLDH : WHITE }}>{w}{i < words.length - 1 ? " " : ""}</span>))}
      </div>
    </AbsoluteFill>
  );
};

const SceneByType: React.FC<{ b: any; i: number; showCaption?: boolean }> = ({ b, i, showCaption = true }) => {
  if (b.visual === "slam") return <Slam text={b.narr} />;
  const src = b.imageUrl;
  const bg = b.visual === "video" ? <VideoScene i={i} src={src} /> : b.visual === "imagem" ? <ImageScene i={i} src={src} /> : <VetorScene i={i} />;
  return (<AbsoluteFill>{bg}{showCaption ? <Caption text={b.narr} /> : null}</AbsoluteFill>);
};

export const EpisodeVideo: React.FC<any> = (props) => {
  const { durationInFrames, fps } = useVideoConfig();
  const lead = 45;
  const beats = beatsFrom(props);
  const cues = Array.isArray(props.cues) ? props.cues : [];
  const hasCues = cues.length > 0;
  const body = Math.max(1, durationInFrames - lead - 40);
  const per = Math.max(1, Math.floor(body / Math.max(1, beats.length)));
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {props.narrationUrl ? <Sequence from={lead}><Audio src={props.narrationUrl} playbackRate={1.18} /></Sequence> : null}
      {props.hasTrilha ? <Audio src={staticFile("trilha.wav")} volume={0.18} /> : null}
      <Sequence from={0} durationInFrames={lead + fps * 2}><Hook text={(beats[0] && beats[0].narr) || props.title} /></Sequence>
      {beats.map((b, i) => (<Sequence key={i} from={lead + i * per} durationInFrames={per}><SceneByType b={b} i={i} showCaption={!hasCues} /></Sequence>))}
      {hasCues ? <CueCaptions cues={cues} lead={lead} fps={fps} /> : null}
      <Sequence from={Math.max(0, durationInFrames - 40)}><CTA question={props.question} /></Sequence>
    </AbsoluteFill>
  );
};
