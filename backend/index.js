import express from 'express';
import http from 'http';
import ip from 'ip';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

app.use(cors());
app.get('/', (req, res) => {
    res.json('ip address: http://' + ip.address() + ':' + PORT);
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.broadcast.emit('user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.broadcast.emit('user disconnected');
    });

    socket.on('message', (msg) => {
        console.log('message: ' + msg);
        io.emit('message', msg);
    });

    socket.on('create room', (username) => {
        const roomCode = crypto.randomBytes(3).toString('hex');
        if (!rooms[roomCode]) {
            rooms[roomCode] = { users: [], leader: socket.id };
            rooms[roomCode].users.push({ id: socket.id, name: username });
            socket.join(roomCode);
            socket.emit('room created', roomCode);
            io.to(roomCode).emit('room users', rooms[roomCode].users);
        } else {
            socket.emit('room full');
        }
    });

    socket.on('join room', (roomCode, username) => {
        if (rooms[roomCode] && rooms[roomCode].users.length < 5) {
            rooms[roomCode].users.push({ id: socket.id, name: username });
            socket.join(roomCode);
            io.to(roomCode).emit('room users', rooms[roomCode].users);
        } else {
            socket.emit('room full');
        }
    });

    socket.on('leave room', (roomCode) => {
        if (rooms[roomCode]) {
            rooms[roomCode].users = rooms[roomCode].users.filter(user => user.id !== socket.id);
            socket.leave(roomCode);
            io.to(roomCode).emit('room users', rooms[roomCode].users);
        }
    });

    socket.on('room message', (roomCode, message) => {
        if (rooms[roomCode]) {
            io.to(roomCode).emit('message', message);
        }
    });
});

server.listen(PORT, () => {
    console.log('Server ip : http://' + ip.address() + ":" + PORT);
});