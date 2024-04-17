import { useContext, useEffect, useRef } from "react";
import { SocketContext } from "../contex/socket";

let count = 0;

export const CanvasStream = () => {
  const localVideo = useRef();
  const socket = useContext(SocketContext);

  useEffect(() => {
    const canvas = document.getElementById("mycanvas");
    const ctx = canvas.getContext("2d");
    let interval = setInterval(() => {
      ctx.clearRect(400, 400, 400, 400);
      ctx.font = "30px Arial";
      ctx.fillStyle = "white";
      ctx.fillRect(10, 10, 100, 100);
      ctx.fillStyle = "black";
      ctx.fillText(count++, 10, 50);
    }, 1000);

    localVideo.current.srcObject = canvas.captureStream(25);
    return () => {
      clearInterval(interval);
      count = 0;
    };
  }, []);

  useEffect(() => {
    socket.emit("start-stream");
    // const canvas = document.getElementById("mycanvas");
    // const stream = canvas.captureStream(25);
    // const mediaRecorder = new MediaRecorder(stream);
    // // Some time passes.
    // mediaRecorder.ondataavailable = (event) => {
    //   console.log("data: ", event.data);

    //   socket.emit("stream-data", event.data);
    //   // Video blob delivered after some delay, with encoded frame rate as close to input
    //   // stream frame rate as possible.
    // };
    // mediaRecorder.start(100);
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((mediaStream) => {
        const mediaRecorder = new MediaRecorder(mediaStream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            socket.emit("stream-data", event.data);
          }
        };

        mediaRecorder.start(100);

        // Handle stopping the recorder when needed...
      })
      .catch((error) => {
        console.error("Error accessing user media:", error);
      });
  }, []);

  return (
    <div>
      <canvas
        id="mycanvas"
        width="1920"
        height="1080"
        style={{ height: 1080, width: 1920, backgroundColor: "gray" }}
      />
      <video
        ref={localVideo}
        autoPlay
        muted
        style={{ height: 400, width: 650, backgroundColor: "black" }}
      />
    </div>
  );
};
