import { useRef } from "react";
import { useEffect } from "react";
import { useConferanceCall } from "../hooks/useConferanceCall";
const RoomId = "test";

export const NewCall = ({ user, user_id }) => {
  const { localStream, remoteStreams } = useConferanceCall({
    room: RoomId,
    user,
    user_id,
  });
  const localVideo = useRef();

  useEffect(() => {
    if (localStream) {
      localVideo.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div>
      <h1>Call View</h1>
      <video ref={localVideo} style={{ height: 500, width: 500 }} autoPlay />
      {remoteStreams &&
        Object.keys(remoteStreams).length &&
        Object.keys(remoteStreams)?.map((item) => {
          return <RemoteVideo remoteStream={remoteStreams[item]} id={item} />;
        })}
    </div>
  );
};

const RemoteVideo = ({ remoteStream, id }) => {
  const remoteVideo = useRef();

  useEffect(() => {
    if (remoteStream) {
      remoteVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <video
      id={id}
      ref={remoteVideo}
      style={{ height: 500, width: 500 }}
      autoPlay
    />
  );
};
