import socketio from "socket.io-client";
import React from "react";
// import { SERVER_URL } from "../utils/constant";

// const SERVER_URL = "https://merntoolapi.project-demo.info:3003";
const SERVER_URL = "https://merntoolapi.project-demo.info/";
// const SERVER_URL = "https://looposapistaging.dsid.com";
// const SERVER_URL = "http://localhost:3003";

console.log("get connection");

export const socket = socketio.connect(SERVER_URL);
export const SocketContext = React.createContext();
