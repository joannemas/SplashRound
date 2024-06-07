const socket = io('https://splashround.onrender.com/');
let roomCode = '';
let username = '';
let timerInterval;
let currentPlayer = '';
let creator = false;
let timerDuration = 0;

socket.on('connect', () => {
    console.log('Connected');
});

socket.on('room users', (users) => {
    updateUsers(users);
});

socket.on('room full', () => {
    alert('Room is full. Please try another room.');
});

socket.on('room created', (code) => {
    roomCode = code;
    creator = true;
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('start-game').style.display = 'block';
    document.getElementById('chat-room').style.display = 'block';
    document.getElementById('connexion').style.display = 'none'; // hide connection section once room is created
});

socket.on('confirm join', ({ username: joinedUsername, creator: isCreator }) => {
    username = joinedUsername;
    creator = isCreator;
    document.getElementById('start-game').style.display = creator ? 'block' : 'none';
    document.getElementById('chat-room').style.display = 'block';
    document.getElementById('user-name').textContent = username;
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('connexion').style.display = 'none'; // hide connection section once joined
});

socket.on('game start', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    timerDuration = timer;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(currentPlayer);
    startTimer(timer);
    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('game-room').style.display = 'block';
});

socket.on('correct word', ({ syllable, currentPlayer: cp }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(cp);
    // continue with the same timer
});

socket.on('update game', ({ syllable, currentPlayer: cp }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(cp);
    startTimer(timerDuration); // use the same duration previously set
});

socket.on('update timer', (timer) => {
    startTimer(timer);
});

socket.on('invalid word', (msg) => {
    alert(msg);
});

socket.on('update users', (users) => {
    updateUsers(users);
});

socket.on('game over', (message) => {
    alert(message);
    location.reload();
});

function createRoom() {
    username = document.getElementById('username').value;
    if (username) {
        socket.emit('create room', username);
    } else {
        alert('Please enter a username.');
    }
}

function joinRoomWithCode() {
    const joinRoomCode = document.getElementById('join-room-code').value;
    const joinUsername = document.getElementById('join-username').value;
    if (joinRoomCode && joinUsername) {
        roomCode = joinRoomCode;
        socket.emit('join room', joinRoomCode, joinUsername);
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

function updateStatus(cp) {
    const statusElement = document.getElementById('status');
    const messageInput = document.getElementById('message');
    const sendButton = document.querySelector('button[onclick="send()"]');

    if (cp === username) {
        statusElement.textContent = "C'est votre tour!";
        messageInput.disabled = false;
        sendButton.disabled = false;
    } else {
        statusElement.textContent = `C'est le tour de ${cp}.`;
        messageInput.disabled = true;
        sendButton.disabled = true;
    }
}

function startTimer(duration) {
    const timerElement = document.getElementById('timer');
    const timerBar = document.getElementById('timer-bar');
    let timeRemaining = duration;

    clearInterval(timerInterval);

    timerElement.textContent = `Temps restant: ${timeRemaining}s`;
    timerBar.style.width = '100%';
    timerBar.style.backgroundColor = '#83B4FF';

    timerInterval = setInterval(() => {
        timeRemaining -= 1;
        timerElement.textContent = `Temps restant: ${timeRemaining}s`;
        timerBar.style.width = `${(timeRemaining / duration) * 100}%`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function updateUsers(users) {
    const userList = document.getElementById('users');
    userList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `<p>${user.lives}</p><img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;"> <p>${user.name}</p>`;
        userList.appendChild(userItem);
    });

    const playersList = document.getElementById('players');
    playersList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `<p>${user.lives}</p><img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;"> <p>${user.name}</p>`;
        if (user.name === currentPlayer) {
            document.getElementById('current-player').innerHTML = userItem.innerHTML;
        } else {
            playersList.appendChild(userItem);
        }
    });
}
