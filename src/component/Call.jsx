import { useContext, useRef, useState } from "react";
import { useEffect } from "react";
import { SocketContext } from "../contex/socket";

const RoomId = "test";
var pc;

const pcConfig = {
  iceServers: [
    { urls: ["stun:bn-turn1.xirsys.com"] },
    {
      username:
        "0kYXFmQL9xojOrUy4VFemlTnNPVFZpp7jfPjpB3AjxahuRe4QWrCs6Ll1vDc7TTjAAAAAGAG2whXZWJUdXRzUGx1cw==",
      credential: "285ff060-5a58-11eb-b269-0242ac140004",
      urls: [
        "turn:bn-turn1.xirsys.com:80?transport=udp",
        "turn:bn-turn1.xirsys.com:3478?transport=udp",
        "turn:bn-turn1.xirsys.com:80?transport=tcp",
        "turn:bn-turn1.xirsys.com:3478?transport=tcp",
        "turns:bn-turn1.xirsys.com:443?transport=tcp",
        "turns:bn-turn1.xirsys.com:5349?transport=tcp",
      ],
    },
  ],
};

var callStarted = false;
var globalisInitiator = false;
var globalLocalStream;
var globalChannelReady = false;
var globalRemoteStream;

export const CallView = ({ user }) => {
  const socket = useContext(SocketContext);
  const [isInitiator, setIsInitator] = useState(false);
  globalisInitiator = isInitiator;
  const [localStream, setLocalStream] = useState();
  globalLocalStream = localStream;
  const [isChannelReady, setIsChannelReady] = useState(false);
  globalChannelReady = isChannelReady;
  const localVideo = useRef();
  const remoteVideo = useRef();
  //   const [localVideo, setLocalVideo] = useState();

  const handleSocketEvents = () => {
    socket.on("created", () => {
      setIsInitator(true);
    });

    socket.on("message", function (message, room) {
      console.log("Client received message:", message, room);
      if (message === "got user media") {
        maybeStartCall();
      } else if (message.type === "offer") {
        if (user !== "creator" && !callStarted) {
          console.log("get offer and start call");

          maybeStartCall();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
      } else if (message.type === "answer" && callStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
      } else if (message.type === "candidate" && callStarted) {
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        pc.addIceCandidate(candidate);
      } else if (message === "bye" && callStarted) {
        handleRemoteHangup();
      }
    });

    socket.on("join", function (room) {
      console.log("Another peer made a request to join room " + room);
      console.log("This peer is the initiator of room " + room + "!");
      setIsChannelReady(true);
    });

    socket.on("joined", function (room) {
      setIsChannelReady(true);
    });
  };

  const initCallData = async () => {
    await handleLocalStream();
    handleSocketEvents();
  };

  useEffect(() => {
    socket.emit("create_or_join_video_call_room", { room: RoomId, user });
    initCallData();

    return () => {
      socket.removeAllListeners("created");
      socket.removeAllListeners("message");
      socket.removeAllListeners("join");
      socket.removeAllListeners("joined");
      sendMessage("bye", RoomId);
      if (pc) {
        pc.close();
      }
      pc = null;
      callStarted = false;
    };
  }, []);

  useEffect(() => {
    if (isInitiator && localStream && isChannelReady) {
      maybeStartCall();
    }
  }, [isInitiator, localStream, isChannelReady]);

  //Function to send message in a room
  function sendMessage(message, room) {
    console.log("Client sending message: ", message, room);
    socket.emit("message", message, room);
  }

  function doCall() {
    console.log("Sending offer to peer");
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
  }

  function doAnswer() {
    console.log("Sending answer to peer.");
    pc.createAnswer().then(
      setLocalAndSendMessage,
      onCreateSessionDescriptionError
    );
  }

  function onCreateSessionDescriptionError(error) {
    console.log("Failed to create session description: " + error.toString());
  }

  function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log("setLocalAndSendMessage sending message", sessionDescription);
    sendMessage(sessionDescription, RoomId);
  }

  const handleLocalStream = () => {
    return new Promise((resolve) => {
      navigator.mediaDevices
        .getUserMedia({ audio: false, video: true })
        .then((stream) => {
          console.log("Adding local stream.");
          setLocalStream(stream);
          localVideo.current.srcObject = stream;
          sendMessage("got user media", RoomId);
          resolve(true);
        })
        .catch(function (e) {
          console.log(e);
          // alert("getUserMedia() error: " + e.name);
        });
    });
  };

  const maybeStartCall = () => {
    if (!callStarted && globalLocalStream) {
      console.log("starting call already");

      createPeerConnection();
      pc.addStream(globalLocalStream);
      callStarted = true;

      if (user === "creator") {
        doCall();
      }
    }
  };

  function createPeerConnection() {
    try {
      pc = new RTCPeerConnection(pcConfig);
      pc.onicecandidate = handleIceCandidate;
      pc.onaddstream = handleRemoteStreamAdded;
      pc.onremovestream = handleRemoteStreamRemoved;

      console.log("Created RTCPeerConnnection");
    } catch (e) {
      console.log("Failed to create PeerConnection, exception: " + e.message);
      alert("Cannot create RTCPeerConnection object.");
      return;
    }
  }

  //Function to handle Ice candidates
  function handleIceCandidate(event) {
    console.log("icecandidate event: ", event);
    if (event.candidate) {
      sendMessage(
        {
          type: "candidate",
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
        },
        RoomId
      );
    } else {
      console.log("End of candidates.");
    }
  }

  function handleRemoteStreamAdded(event) {
    console.log("Remote stream added.");
    globalRemoteStream = event.stream;
    remoteVideo.current.srcObject = event.stream;
  }

  function handleRemoteStreamRemoved(event) {
    // console.log("Remote stream removed. Event: ", event);
  }

  function handleCreateOfferError(event) {
    console.log("createOffer() error: ", event);
  }

  function handleRemoteHangup() {
    console.log("Session terminated.");
    setIsChannelReady(false);
    setIsInitator(false);
    callStarted = false;
    if (pc) {
      pc.close();
    }
    pc = null;
  }

  return (
    <div>
      <h1>Call View</h1>
      <video ref={localVideo} style={{ height: 500, width: 500 }} autoPlay />
      <video ref={remoteVideo} style={{ height: 500, width: 500 }} autoPlay />
    </div>
  );
};
