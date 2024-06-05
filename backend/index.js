import express from 'express';
import http from 'http';
import ip from 'ip';
import { Server } from 'socket.io';
import cors from 'cors';
import fetch from 'node-fetch';
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
const wordAPI = 'https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json';
let words = [];

const generateValidLetters = async () => {
    const response = await fetch(wordAPI);
    words = await response.json();
    words = words.filter(word => word.length >= 5);

    let validLetters = '';
    let found = false;
    while (!found) {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const randomIndex1 = Math.floor(Math.random() * letters.length);
        const randomIndex2 = Math.floor(Math.random() * letters.length);
        validLetters = `${letters[randomIndex1]}${letters[randomIndex2]}`;

        for (const word of words) {
            if (word.includes(validLetters)) {
                found = true;
                break;
            }
        }
    }
    return validLetters;
};

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.broadcast.emit('user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.broadcast.emit('user disconnected');
    });

    socket.on('create room', async (username) => {
        const roomCode = crypto.randomBytes(3).toString('hex');
        if (!rooms[roomCode]) {
            const letters = await generateValidLetters();
            rooms[roomCode] = {
                users: [], 
                letters: letters,
                currentPlayerIndex: 0
            };
            rooms[roomCode].users.push({ id: socket.id, name: username });
            socket.join(roomCode);
            socket.emit('room created', roomCode);
            io.to(roomCode).emit('room users', rooms[roomCode].users);
            io.to(roomCode).emit('game start', { letters: letters, currentPlayer: rooms[roomCode].users[0].id });
        } else {
            socket.emit('room full');
        }
    });

    socket.on('join room', async (roomCode, username) => {
        if (rooms[roomCode] && rooms[roomCode].users.length < 5) {
            rooms[roomCode].users.push({ id: socket.id, name: username });
            socket.join(roomCode);
            io.to(roomCode).emit('room users', rooms[roomCode].users);
            socket.emit('game start', { letters: rooms[roomCode].letters, currentPlayer: rooms[roomCode].users[0].id });
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

    socket.on('word', async ({ roomCode, word }) => {
        const room = rooms[roomCode];
        if (room) {
            const currentLetters = room.letters;
            if (word.length >= 5 && word.includes(currentLetters)) {
                if (words.includes(word)) {
                    room.letters = await generateValidLetters();
                    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.users.length;
                    const nextPlayer = room.users[room.currentPlayerIndex].id;
                    io.to(roomCode).emit('correct word', { letters: room.letters, currentPlayer: nextPlayer });
                } else {
                    socket.emit('invalid word', 'Invalid word.');
                }
            } else {
                socket.emit('invalid word', 'Word does not contain the given letters or is too short.');
            }
        } else {
            socket.emit('invalid word', 'Room not found.');
        }
    });
});

server.listen(PORT, () => {
    console.log('Server ip : http://' + ip.address() + ":" + PORT);
});
