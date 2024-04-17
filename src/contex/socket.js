import socketio from "socket.io-client";
import React from "react";
const SERVER_URL = "http://localhost:4000";

export const socket = socketio.connect(SERVER_URL);
export const SocketContext = React.createContext();
