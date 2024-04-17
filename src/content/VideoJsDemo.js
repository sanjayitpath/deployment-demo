import React from "react";
import { VideoJsPlayer } from "../component/VideoJsPlayer";

export const VideoJsDemo = () => {
  const playerRef = React.useRef(null);

  const videoJsOptions = {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    muted: true,
    liveui: true,
    html5: {
      vhs: {
        overrideNative: true,
      },
      //   nativeAudioTracks: false,
      //   nativeVideoTracks: false,
    },

    sources: [
      {
        src: "http://localhost:4000/media/live/test.m3u8",
        type: "application/x-mpegURL",
      },
    ],
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;

    // You can handle player events here, for example:
    player.on("waiting", () => {
      console.log("player is waiting");
    });

    player.on("dispose", () => {
      console.log("player will dispose");
    });
  };

  return (
    <div style={{ width: "60%" }}>
      <VideoJsPlayer options={videoJsOptions} onReady={handlePlayerReady} />
    </div>
  );
};
