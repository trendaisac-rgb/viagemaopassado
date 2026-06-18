import React from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const anton = loadAnton().fontFamily;
const inter = loadInter().fontFamily;
const GOLD = "#E9B84A";
const BG = "#05060A";
const WHITE = "#F4F1E8";

export const calcMeta = async ({ props }: any) => {
  const fps = 30, lead = 45, tail = 30;
  let dur = 40;
  try { if (props.narrationUrl) dur = await getAudioDurationInSeconds(props.narrationUrl); } catch (_) {}
  const sped = dur / 1.18; // ritmo aprovado da skill (atempo 1.18)
  return { durationInFrames: Math.round(lead + sped * fps + tail) };
};

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

const Hook: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, 50, 65], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, opacity: o }}>
      <div style={{ fontFamily: anton, color: GOLD, fontSize: 96, textAlign: "center", lineHeight: 1.05, textTransform: "uppercase" }}>{text}</div>
    </AbsoluteFill>
  );
};

const Beat: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  if (words(text) <= 3) {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
        <div style={{ fontFamily: anton, color: WHITE, fontSize: 130, textAlign: "center", textTransform: "uppercase" }}>{text}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", padding: "0 70px 240px", opacity: o }}>
      <div style={{ fontFamily: inter, fontWeight: 800, color: WHITE, fontSize: 62, textAlign: "center", lineHeight: 1.15, textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}>{text}</div>
    </AbsoluteFill>
  );
};

const CTA: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({ frame: f, fps: 30, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${0.9 + 0.1 * s})` }}>
      <div style={{ fontFamily: anton, color: GOLD, fontSize: 84, textTransform: "uppercase" }}>Viagem ao Passado</div>
      <div style={{ fontFamily: anton, color: WHITE, fontSize: 54, marginTop: 18 }}>+ SEGUIR</div>
    </AbsoluteFill>
  );
};

export const EpisodeVideo: React.FC<{ script: string; title: string; narrationUrl: string }> = ({ script, title, narrationUrl }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const lead = 45;
  const beats = String(script).split("[CORTE]").map((b) => b.trim()).filter(Boolean);
  const body = Math.max(1, durationInFrames - lead - 45);
  const per = Math.max(1, Math.floor(body / Math.max(1, beats.length)));
  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: inter }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(233,184,74,0.12), transparent 60%)" }} />
      {narrationUrl ? <Sequence from={lead}><Audio src={narrationUrl} playbackRate={1.18} /></Sequence> : null}
      <Sequence from={0} durationInFrames={lead + fps * 2}><Hook text={beats[0] ?? title} /></Sequence>
      {beats.map((b, i) => (
        <Sequence key={i} from={lead + i * per} durationInFrames={per}><Beat text={b} /></Sequence>
      ))}
      <Sequence from={Math.max(0, durationInFrames - 45)}><CTA /></Sequence>
    </AbsoluteFill>
  );
};
