import express from 'express';
import http from 'http';
import ip from 'ip';
import { Server } from 'socket.io';
import cors from 'cors';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(cors());
app.use('/assets', express.static(join(__dirname, '..', 'front', 'assets')));

app.get('/', (req, res) => {
    res.json('Welcome to SplashRound server!');
});

const rooms = {};
const wordAPI = 'https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json';
const syllables = ['ab', 'al', 'am', 'an', 'ar', 'as', 'at', 'au', 'av', 'ba', 'be', 'bi', 'bo', 'bu', 
                   'ca', 'ce', 'ci', 'co', 'cu', 'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 
                   'ga', 'ge', 'gi', 'go', 'gu', 'ha', 'he', 'hi', 'ho', 'hu', 'ja', 'je', 'ji', 'jo', 
                   'ju', 'ka', 'ke', 'ki', 'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu', 'ma', 'me', 'mi', 
                   'mo', 'mu', 'na', 'ne', 'ni', 'no', 'nu', 'pa', 'pe', 'pi', 'po', 'pu', 'ra', 're', 
                   'ri', 'ro', 'ru', 'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu', 'va', 
                   've', 'vi', 'vo', 'vu'];

let words = [];

const loadWords = async () => {
    const response = await fetch(wordAPI);
    words = await response.json();
    words = words.filter(word => word.length >= 5);
};

const generateValidSyllable = () => {
    let validSyllable = '';
    let found = false;

    while (!found) {
        const randomIndex = Math.floor(Math.random() * syllables.length);
        validSyllable = syllables[randomIndex];

        for (const word of words) {
            if (word.includes(validSyllable)) {
                found = true;
                break;
            }
        }
    }
    return validSyllable;
};

loadWords();

const getAvailableAvatars = () => {
    const avatarPath = join(__dirname, '..', 'front', 'assets');
    return fs.readdirSync(avatarPath).filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));
};

const assignRandomAvatar = (usedAvatars) => {
    const availableAvatars = getAvailableAvatars().filter(avatar => !usedAvatars.includes(avatar));
    if (availableAvatars.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availableAvatars.length);
    return availableAvatars[randomIndex];
};

const formatLivesAsDrops = (lives) => {
    return '💧'.repeat(lives);
};


const startTimer = (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.timer) {
        clearTimeout(room.timer);
    }

    const timerDuration = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
    room.timer = setTimeout(async () => {
        // Decrement user's life
        room.users[room.currentPlayerIndex].lives--;

        // Emit the new event to animate the water gun
        io.to(roomCode).emit('user lost life', {
            userId: room.users[room.currentPlayerIndex].id,
            lives: room.users[room.currentPlayerIndex].lives
        });

        io.to(roomCode).emit('update users', formatUserLives(room.users));

        if (room.users[room.currentPlayerIndex].lives <= 0) {
            room.users.splice(room.currentPlayerIndex, 1);

            if (room.users.length === 1) {
                io.to(roomCode).emit('game over', `${room.users[0].name} a gagné!`);
                delete rooms[roomCode];
                return;
            }

            if (room.currentPlayerIndex >= room.users.length) {
                room.currentPlayerIndex = 0;
            }
        } else {
            room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.users.length;
        }

        room.syllable = generateValidSyllable();
        const nextPlayer = room.users[room.currentPlayerIndex];
        io.to(roomCode).emit('update game', {
            syllable: room.syllable,
            currentPlayer: nextPlayer.name,
            timer: timerDuration
        });
        startTimer(roomCode);
    }, timerDuration * 1000);

    io.to(roomCode).emit('update timer', timerDuration);
};


const formatUserLives = (users) => {
    return users.map(user => ({
        ...user,
        lives: formatLivesAsDrops(user.lives),
    }));
};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                if (room.users.length === 0) {
                    if (room.timer) clearTimeout(room.timer);
                    delete rooms[roomCode];
                } else {
                    io.to(roomCode).emit('room users', formatUserLives(room.users));
                }
                break;
            }
        }
    });

    socket.on('create room', async (username) => {
        const roomCode = crypto.randomBytes(3).toString('hex');
        const syllable = generateValidSyllable();
        const avatar = assignRandomAvatar([]);

        rooms[roomCode] = {
            users: [{ id: socket.id, name: username, lives: 3, avatar: avatar }],
            syllable: syllable,
            currentPlayerIndex: 0,
            creator: socket.id,
            timer: null,
            usedAvatars: [avatar]
        };

        socket.join(roomCode);
        socket.emit('room created', roomCode);
        io.to(roomCode).emit('room users', formatUserLives(rooms[roomCode].users));
    });

    socket.on('join room', (roomCode, username) => {
        const room = rooms[roomCode];
        if (room && room.users.length < 5) {
            const avatar = assignRandomAvatar(room.usedAvatars);
            room.users.push({ id: socket.id, name: username, lives: 3, avatar: avatar });
            room.usedAvatars.push(avatar);
            socket.join(roomCode);
            socket.emit('confirm join', { username, creator: room.creator === socket.id });
            io.to(roomCode).emit('room users', formatUserLives(room.users));
        } else {
            socket.emit('room full');
        }
    });

    socket.on('start game', (roomCode) => {
        const room = rooms[roomCode];
        if (room && room.creator === socket.id) {
            const initialTimer = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
            room.syllable = generateValidSyllable();
            room.currentPlayerIndex = 0; // Ensure creator starts the game
            io.to(roomCode).emit('game start', {
                syllable: room.syllable,
                currentPlayer: room.users[room.currentPlayerIndex].name,
                timer: initialTimer
            });
            startTimer(roomCode);
        }
    });

    socket.on('leave room', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            room.users = room.users.filter(user => user.id !== socket.id);
            if (room.timer) clearTimeout(room.timer);
            socket.leave(roomCode);
            if (room.users.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('room users', formatUserLives(room.users));
            }
        }
    });

    socket.on('word', async ({ roomCode, word }) => {
        const room = rooms[roomCode];
        if (room) {
            const currentSyllable = room.syllable;
            if (word.length >= 5 && word.includes(currentSyllable)) {
                if (words.includes(word)) {
                    room.syllable = generateValidSyllable();
                    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.users.length;
                    const nextPlayer = room.users[room.currentPlayerIndex];
                    const timerDuration = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
                    io.to(roomCode).emit('correct word', {
                        syllable: room.syllable,
                        currentPlayer: nextPlayer.name,
                        timer: timerDuration // send new timer value
                    });
                    startTimer(roomCode); // reset timer for the new player
                } else {
                    socket.emit('invalid word', 'Mot non valide.');
                }
            } else {
                socket.emit('invalid word', 'Le mot ne contient pas la syllabe donnée ou est trop court.');
            }
        } else {
            socket.emit('invalid word', 'Room non trouvée.');
        }
    });
});

server.listen(PORT, () => {
    console.log('Server is running on port:', PORT);
});
