import flvjs from "flv.js";
import { useEffect } from "react";

export const FlvPlayer = () => {
  const playVideo = () => {
    if (flvjs.isSupported()) {
      var videoElement = document.getElementById("videoElement");
      var flvPlayer = flvjs.createPlayer({
        type: "flv",
        url: "http://localhost:8000/stream/test.flv",
      });
      flvPlayer.attachMediaElement(videoElement);
      flvPlayer.load();
      flvPlayer.play();
    }
  };

  return (
    <div>
      <video
        controls={true}
        id="videoElement"
        style={{ height: 500, width: 500 }}
      />
      <button
        onClick={() => {
          playVideo();
        }}
      >
        Play
      </button>
    </div>
  );
};
