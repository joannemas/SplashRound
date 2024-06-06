const socket = io('http://localhost:3000');
let roomCode = '';
let username = '';
let timerInterval;

socket.on('connect', () => {
    console.log('Connected');
});

socket.on('room users', (users) => {
    const userList = document.getElementById('users');
    userList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `<img src="../assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 50px;"> ${user.name} (Vies: ${user.lives})`;
        userList.appendChild(userItem);
    });
});

socket.on('room full', () => {
    alert('Room is full. Please try another room.');
});

socket.on('room created', (code) => {
    roomCode = code;
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('room-code-display').style.display = 'block';
    document.getElementById('start-game').style.display = 'block';
});

socket.on('game start', ({ syllable, currentPlayer, timer }) => {
    document.getElementById('syllable').textContent = `Syllabe : ${syllable}`;
    updateStatus(currentPlayer);
    startTimer(timer);
});

socket.on('correct word', ({ syllable, currentPlayer }) => {
    document.getElementById('syllable').textContent = `Syllabe : ${syllable}`;
    updateStatus(currentPlayer);
});

socket.on('update game', ({ syllable, currentPlayer, timer }) => {
    document.getElementById('syllable').textContent = `Syllabe : ${syllable}`;
    updateStatus(currentPlayer);
    startTimer(timer);
});

socket.on('update timer', (timer) => {
    startTimer(timer);
});

socket.on('invalid word', (msg) => {
    alert(msg);
});

socket.on('update users', (users) => {
    const userList = document.getElementById('users');
    userList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `<img src="../assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 50px;"> ${user.name} (Vies: ${user.lives})`;
        userList.appendChild(userItem);
    });
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
        alert('Please enter a username.');
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

function startGame() {
    socket.emit('start game', roomCode);
    document.getElementById('start-game').style.display = 'none';
}

function send() {
    const word = document.getElementById('message').value;
    socket.emit('word', { roomCode: roomCode, word: word });
}

function updateStatus(currentPlayer) {
    const statusElement = document.getElementById('status');
    if (currentPlayer === username) {
        statusElement.textContent = "C'est votre tour!";
    } else {
        statusElement.textContent = `C'est le tour de ${currentPlayer}.`;
    }
}

function startTimer(duration) {
    const timerElement = document.getElementById('timer');
    let timeRemaining = duration;

    clearInterval(timerInterval);

    timerElement.textContent = `Temps restant: ${timeRemaining}s`;
    timerInterval = setInterval(() => {
        timeRemaining -= 1;
        timerElement.textContent = `Temps restant: ${timeRemaining}s`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}
