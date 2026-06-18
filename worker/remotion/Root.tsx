import React from "react";
import { Composition } from "remotion";
import { EpisodeVideo, calcMeta } from "./EpisodeVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Episode"
      component={EpisodeVideo as any}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ script: "Você nunca ouviu isso [CORTE] A virada [CORTE] Segue pra parte 2", title: "Viagem ao Passado", narrationUrl: "" }}
      calculateMetadata={calcMeta as any}
    />
  );
};
