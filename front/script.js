const socket = io('https://splashround.onrender.com/');
let roomCode = '';
let username = '';
let timerInterval;
let currentPlayer = '';
let creator = false;

socket.on('connect', () => {
    console.log('Connected');
});

socket.on('room users', (users) => {
    updateUsers(users);
    grayscaleDeadPlayers(users); // Grayscale players who have no lives
});

socket.on('room full', () => {
    showAlert('Room is full. Please try another room.', 'danger');
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
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('connexion').style.display = 'none'; // hide connection section once joined
});

socket.on('game start', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(currentPlayer);
    startTimer(timer);
    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('game-room').style.display = 'block';
});

socket.on('correct word', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(cp);
    startTimer(timer); // restart the timer with new value
    showAlert('Mot correct! Passe au tour suivant.', 'success');
});

socket.on('update game', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(cp);
    startTimer(timer); // restart the timer with new value
    showAlert('Passez au tour suivant.', 'info');
});

socket.on('update timer', (timer) => {
    startTimer(timer);
});

socket.on('invalid word', (msg) => {
    showAlert(msg, 'danger');
});

socket.on('update users', (users) => {
    updateUsers(users);
    grayscaleDeadPlayers(users);
});

socket.on('game over', (message) => {
    showAlert(message, 'success');
    setTimeout(() => location.reload(), 5000);
});

function createRoom() {
    const usernameInput = document.getElementById('username').value;
    if (usernameInput) {
        username = usernameInput;
        socket.emit('create room', username);
    } else {
        showAlert('Please enter a username.', 'warning');
    }
}

function joinRoomWithCode() {
    const joinRoomCode = document.getElementById('join-room-code').value;
    const joinUsername = document.getElementById('join-username').value;
    if (joinRoomCode && joinUsername) {
        roomCode = joinRoomCode;
        username = joinUsername;
        socket.emit('join room', joinRoomCode, joinUsername);
    } else {
        showAlert('Veuillez compléter tous les champs.', 'warning');
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

    timerInterval = setInterval(() => {
        timeRemaining -= 1;
        timerElement.textContent = `Temps restant: ${timeRemaining}s`;
        timerBar.style.width = `${(timeRemaining / duration) * 100}%`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            socket.emit('times up', { roomCode: roomCode });
        }
    }, 1000);
}

function updateUsers(users) {
    const userList = document.getElementById('users');
    const myUserDiv = document.getElementById('my-player');
    const myUser = users.find(user => user.name === username);

    // Clear
    userList.innerHTML = '';
    myUserDiv.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `<img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;"> <p>${user.name}</p>`;;
        
        if (myUser === user) {
            myUserDiv.innerHTML = `<img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;"> <p>${user.name}</p>`;
        } else {
            userList.appendChild(userItem);
        }
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

function grayscaleDeadPlayers(users) {
    users.forEach(user => {
        const userElement = document.querySelector(`#players li img[alt='Avatar de ${user.name}']`);
        if (userElement && user.lives === 0) {
            userElement.parentElement.classList.add('grayscale');
        }
    });
}

function showAlert(message, type) {
    const alertContainer = document.createElement('div');
    alertContainer.classList.add('rounded-md', 'p-4', 'mb-4');

    switch(type) {
        case 'success':
            alertContainer.classList.add('bg-green-50', 'text-green-700');
            alertContainer.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-7.707a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 011.414 1.414L10 14.414l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium">Success</h3>
                        <div class="mt-2 text-sm">
                            <p>${message}</p>
                        </div>
                    </div>
                </div>`;
            break;
        case 'warning':
            alertContainer.classList.add('bg-yellow-50', 'text-yellow-700');
            alertContainer.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.684-1.36 3.449 0l6.519 11.608c.763 1.357-.208 3.043-1.725 3.043H3.483c-1.517 0-2.488-1.686-1.725-3.043L8.257 3.099zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-.25-4a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0V9z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium">Warning</h3>
                        <div class="mt-2 text-sm">
                            <p>${message}</p>
                        </div>
                    </div>
                </div>`;
            break;
        case 'danger':
            alertContainer.classList.add('bg-red-50', 'text-red-700');
            alertContainer.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-10.293a1 1 0 011.414 0L10 9.586l2.293-2.293a1 1 0 111.414 1.414L10 12.414l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium">Error</h3>
                        <div class="mt-2 text-sm">
                            <p>${message}</p>
                        </div>
                    </div>
                </div>`;
            break;
        case 'info':
        default:
            alertContainer.classList.add('bg-yellow-50', 'text-yellow-700');
            alertContainer.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.684-1.36 3.449 0l6.519 11.608c.763 1.357-.208 3.043-1.725 3.043H3.483c-1.517 0-2.488 ...-1.686-1.725-3.043L8.257 3.099zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-.25-4a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0V9z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium">Information</h3>
                        <div class="mt-2 text-sm">
                            <p>${message}</p>
                        </div>
                    </div>
                </div>`;
            break;
    }

    document.getElementById('alert-container').appendChild(alertContainer);
    setTimeout(() => {
        alertContainer.remove();
    }, 3000);
}
