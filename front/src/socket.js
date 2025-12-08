import { io } from "socket.io-client";

let socket;

const connectSocket = (username) => {
    console.log("Подключаться будет "+username);
    if (!socket) {
        socket = io("http://127.0.0.1:5000", {
            query: { username },
            transports: ["websocket"],
        });
    }
    return socket;
};

const getSocket = () => socket;

const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export { connectSocket, getSocket, disconnectSocket }
