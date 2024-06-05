const socket = io('http://localhost:3000');
let roomCode = '';
let username = '';

socket.on('connect', () => {
    console.log('Connected');
});

socket.on('room users', (users) => {
    const userList = document.getElementById('users');
    userList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.textContent = user.name;
        userList.appendChild(userItem);
    });
});

socket.on('room full', () => {
    alert('Le salon est plein.');
});

socket.on('room created', (code) => {
    roomCode = code;
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('room-code-display').style.display = 'block';
});

socket.on('game start', ({ letters, currentPlayer }) => {
    document.getElementById('letters').textContent = `Lettres : ${letters}`;
    updateStatus(currentPlayer);
});

socket.on('correct word', ({ letters, currentPlayer }) => {
    document.getElementById('letters').textContent = `Lettres : ${letters}`;
    updateStatus(currentPlayer);
});

socket.on('invalid word', (msg) => {
    alert(msg);
});

function createRoom() {
    username = document.getElementById('username').value;
    if (username) {
        socket.emit('create room', username);
        document.getElementById('create-room').style.display = 'none';
        document.getElementById('join-room').style.display = 'none';
        document.getElementById('chat-room').style.display = 'block';
        document.getElementById('user-name').textContent = username;
    } else {
        alert('N\'oublie pas d\'entrer ton pseudo.');
    }
}

function joinRoomWithCode() {
    const joinRoomCode = document.getElementById('join-room-code').value;
    username = document.getElementById('join-username').value;
    if (joinRoomCode && username) {
        roomCode = joinRoomCode;
        socket.emit('join room', joinRoomCode, username);
        document.getElementById('create-room').style.display = 'none';
        document.getElementById('join-room').style.display = 'none';
        document.getElementById('chat-room').style.display = 'block';
        document.getElementById('user-name').textContent = username;
        document.getElementById('room-code').textContent = roomCode;
    } else {
        alert('Veuillez compléter tous les champs.');
    }
}

function send() {
    const word = document.getElementById('message').value;
    socket.emit('word', { roomCode: roomCode, word: word });
}

function updateStatus(currentPlayer) {
    if (socket.id === currentPlayer) {
        document.getElementById('status').textContent = "C'est votre tour!";
    } else {
        document.getElementById('status').textContent =  "C'est le tour de l'autre joueur.";
    }
}
