import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../contex/socket";

var callStarted = false;
var globalLocalStream;
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

export const useCall = ({ user, room }) => {
  const socket = useContext(SocketContext);
  const [localStream, setLocalStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [isChannelReady, setIsChannelReady] = useState(false);
  const isInitiator = user === "creator";
  globalLocalStream = localStream;

  useEffect(() => {
    socket.emit("create_or_join_video_call_room", { room, user });
    initCallData();

    return () => {
      socket.removeAllListeners("created");
      socket.removeAllListeners("message");
      socket.removeAllListeners("join");
      socket.removeAllListeners("joined");
      sendMessage("bye", room);
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

  const initCallData = async () => {
    await handleLocalStream();
    handleSocketEvents();
  };

  const handleLocalStream = () => {
    return new Promise((resolve) => {
      navigator.mediaDevices
        .getUserMedia({ audio: false, video: true })
        .then((stream) => {
          console.log("Adding local stream.");
          setLocalStream(stream);
          sendMessage("got user media", room);
          resolve(true);
        })
        .catch(function (e) {
          console.log(e);
          // alert("getUserMedia() error: " + e.name);
        });
    });
  };

  const handleSocketEvents = () => {
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
        // doAnswer();
      }
      // else if (message.type === "answer" && callStarted) {
      //   pc.setRemoteDescription(new RTCSessionDescription(message));
      // }
      else if (message.type === "candidate" && callStarted) {
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

  function sendMessage(message, room) {
    console.log("Client sending message: ", message, room);
    socket.emit("message", message, room);
  }

  const maybeStartCall = () => {
    console.log("callStarted: ", callStarted);

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
        room
      );
    } else {
      console.log("End of candidates.");
    }
  }

  function handleRemoteStreamAdded(event) {
    console.log("Remote stream added.");
    setRemoteStream(event.stream);
  }

  function handleRemoteStreamRemoved(event) {
    // console.log("Remote stream removed. Event: ", event);
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

  function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log("setLocalAndSendMessage sending message", sessionDescription);
    sendMessage(sessionDescription, room);
  }

  function onCreateSessionDescriptionError(error) {
    console.log("Failed to create session description: " + error.toString());
  }

  function handleCreateOfferError(event) {
    console.log("createOffer() error: ", event);
  }

  function handleRemoteHangup() {
    console.log("Session terminated.");
    setIsChannelReady(false);
    callStarted = false;
    if (pc) {
      pc.close();
    }
    pc = null;
  }

  return {
    localStream,
    remoteStream,
  };
};
