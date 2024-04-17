import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../contex/socket";

var globalLocalStream;
var globalConnections;
var globalRemoteStreams;
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

export const useConferanceCall = ({ user, room, user_id }) => {
  const socket = useContext(SocketContext);
  const [localStream, setLocalStream] = useState();
  const [remoteStreams, setRemoteStreams] = useState();

  const [peerconnections, setPeerconnections] = useState();
  globalConnections = peerconnections;
  globalLocalStream = localStream;
  globalRemoteStreams = remoteStreams;

  useEffect(() => {
    socket.emit("create_or_join_video_call_room", { room, user, user_id });
    initCallData();

    return () => {
      socket.removeAllListeners("created");
      socket.removeAllListeners("message");
      socket.removeAllListeners("join");
      socket.removeAllListeners("joined");
      sendMessage({ type: "bye", from: user_id }, room);
      const tracks = globalLocalStream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      globalConnections = null;
      globalLocalStream = null;
      globalRemoteStreams = null;
    };
  }, []);

  useEffect(() => {
    if (peerconnections && localStream) {
      const connectionsKeys = Object.keys(globalConnections);
      for (let i = 0; i < connectionsKeys.length; i++) {
        const connection = globalConnections[connectionsKeys[i]];

        try {
          connection.onicecandidate = (event) => {
            handleIceCandidate(event, connectionsKeys[i], connection);
          };
          connection.onaddstream = (event) => {
            // console.log("for get new remote stream");
            handleRemoteStreamAdded(event, connectionsKeys[i]);
          };
          connection.onremovestream = (event) => {
            handleRemoteStreamRemoved(event, connectionsKeys[i]);
          };
        } catch (e) {
          console.log(
            "Failed to create PeerConnection, exception: " + e.message
          );
          return;
        }
      }
    }
  }, [peerconnections, localStream]);

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
          // sendMessage("got user media", room);
          resolve(true);
        })
        .catch(function (e) {
          console.log(e);
        });
    });
  };

  const handleSocketEvents = () => {
    socket.on("message", function (message, room) {
      if (message.to === user_id) {
        console.log("Client received message:", message, room);

        if (message?.offer?.type === "offer" && message.to === user_id) {
          const connection = maybeStartCallForConferance(
            message?.connection_id,
            message.from
          );
          connection.addStream(globalLocalStream);
          connection.setRemoteDescription(
            new RTCSessionDescription(message?.offer)
          );
          answerOfferForConnection(connection, message?.connection_id);
        } else if (message?.answer?.type === "answer") {
          if (globalConnections[message.connection_id]) {
            globalConnections[message.connection_id].setRemoteDescription(
              new RTCSessionDescription(message.answer)
            );
          }
        } else if (message.type === "candidate") {
          var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate,
          });

          if (
            message.connection_id &&
            globalConnections[message.connection_id]
          ) {
            globalConnections[message.connection_id].addIceCandidate(candidate);
          }
        }
      }
      if (message.type === "bye") {
        handleRemoteHangup(message.from);
      }
    });

    socket.on("join", function ({ room, user_id }) {
      console.log("Another peer made a request to join room " + room);
      console.log("This peer is the initiator of room " + room + "!");
      const connection_id = Math.floor(Math.random() * 1000000000).toString();

      const connection = maybeStartCallForConferance(connection_id, user_id);
      connection.addStream(globalLocalStream);
      createOfferForConnectionAndSend(connection, connection_id);
    });
  };

  function sendMessage(message, room) {
    socket.emit("message", message, room);
  }

  const maybeStartCallForConferance = (connection_id, user_id) => {
    const connection = createPeerConnectionForConferance(
      connection_id,
      user_id
    );
    return connection;
  };

  function createPeerConnectionForConferance(connection_id, user_id) {
    try {
      let allConnection = { ...globalConnections };
      let connection = new RTCPeerConnection(pcConfig);
      connection.user_id = user_id;
      allConnection[connection_id] = connection;
      globalConnections = allConnection;
      setPeerconnections(allConnection);
      return allConnection[connection_id];
    } catch (e) {
      console.log("Failed to create PeerConnection, exception: " + e.message);
      return;
    }
  }

  //Function to handle Ice candidates
  function handleIceCandidate(event, connection_id, connection) {
    console.log("icecandidate event: ", event, connection_id);
    if (event.candidate) {
      sendMessage(
        {
          type: "candidate",
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          connection_id,
          from: user_id,
          to: connection.user_id,
        },
        room
      );
    } else {
      console.log("End of candidates.");
    }
  }

  function handleRemoteStreamAdded(event, connection_id) {
    console.log("Remote stream added.");
    let allRemoteStreams = { ...globalRemoteStreams };
    allRemoteStreams[connection_id] = event.stream;
    setRemoteStreams(allRemoteStreams);
  }

  function handleRemoteStreamRemoved(event) {
    // console.log("Remote stream removed. Event: ", event);
  }

  const createOfferForConnectionAndSend = (connection, connection_id) => {
    console.log("Sending offer to peer for conferance", connection);
    connection.createOffer((offer) => {
      connection.setLocalDescription(offer);
      console.log("setLocalAndSendMessage sending message", offer);
      sendMessage(
        {
          offer,
          connection_id,
          to: connection.user_id,
          from: user_id,
        },
        room
      );
    }, handleCreateOfferError);
  };

  function answerOfferForConnection(connection, connection_id) {
    console.log("Sending answer to peer.", connection, connection_id);
    connection.createAnswer().then((answer) => {
      connection.setLocalDescription(answer);
      console.log("setLocalAndSendMessage sending message", answer);
      sendMessage(
        {
          answer,
          connection_id,
          to: connection.user_id,
          from: user_id,
        },
        room
      );
    }, onCreateSessionDescriptionError);
  }

  function onCreateSessionDescriptionError(error) {
    console.log("Failed to create session description: " + error.toString());
  }

  function handleCreateOfferError(event) {
    console.log("createOffer() error: ", event);
  }

  function handleRemoteHangup(user_id) {
    const connectionsKeys = Object.keys(globalConnections);
    for (let i = 0; i < connectionsKeys.length; i++) {
      if (globalConnections[connectionsKeys[i]]?.user_id === user_id) {
        delete globalConnections[connectionsKeys[i]];
        setPeerconnections(globalConnections);
        delete globalRemoteStreams[connectionsKeys[i]];
        if (Object.keys(globalRemoteStreams).length) {
          setRemoteStreams(globalRemoteStreams);
        } else {
          setRemoteStreams(null);
        }
      }
    }
  }

  return {
    localStream,
    remoteStreams,
  };
};
