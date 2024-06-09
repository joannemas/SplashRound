const socket = io('https://splashround.onrender.com/');
let roomCode = '';
let username = '';
let timerInterval;
let currentPlayer = '';
let creator = false;
let users = [];

socket.on('connect', () => {
    console.log('Connected');
});

socket.on('room users', (receivedUsers) => {
    console.log('Users reçus de "room users":', receivedUsers);
    setUsers(receivedUsers);
});

socket.on('update users', (receivedUsers) => {
    console.log('Users reçus de "update users":', receivedUsers);
    setUsers(receivedUsers);
});

socket.on('room full', () => {
    showAlert('La salle est pleine.', 'danger');
});

socket.on('room created', (code) => {
    roomCode = code;
    creator = true;
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('start-game').style.display = 'block';
    document.getElementById('chat-room').style.display = 'block';
    document.getElementById('connexion').style.display = 'none';
});

socket.on('confirm join', ({ username: joinedUsername, creator: isCreator }) => {
    username = joinedUsername;
    creator = isCreator;
    document.getElementById('start-game').style.display = creator ? 'block' : 'none';
    document.getElementById('chat-room').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('connexion').style.display = 'none';
});

socket.on('game start', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(currentPlayer);
    startTimer(timer);
    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('game-room').style.display = 'flex';
    document.getElementById('container').style.maxWidth = '900px';
    document.getElementById('water-gun').style.display = 'block';
});

socket.on('correct word', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(cp);
    startTimer(timer);
    showAlert('Mot correct! Passe au tour suivant.', 'success');
});

socket.on('update game', ({ syllable, currentPlayer: cp, timer }) => {
    currentPlayer = cp;
    document.getElementById('syllable').textContent = `Syllabe: ${syllable}`;
    updateStatus(cp);
    startTimer(timer);
    showAlert('Passez au tour suivant.', 'info');
});

socket.on('update timer', (timer) => {
    startTimer(timer);
});

socket.on('invalid word', (msg) => {
    showAlert(msg, 'danger');
});

socket.on('user loses life', (user) => {
    animateWaterGun();
    showAlert(`${user.name} a perdu une vie!`, 'danger');
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

    currentPlayer = cp;
    console.log('Updating users in updateStatus:', users);
    if (Array.isArray(users)) {
        updateUsers(users);
    } else {
        console.error('updateStatus - users n\'est pas un tableau', users);
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

function setUsers(newUsers) {
    if (Array.isArray(newUsers)) {
        users = newUsers;
        console.log('Nouv users:', users);
        updateUsers(users);
    } else {
        console.error('setUsers - newUsers n\'est pas un tableau', newUsers);
    }
}

function updateUsers(users) {
    console.log('Updating users:', users);
    if (!Array.isArray(users)) {
        console.error('updateUsers - users n\'est pas un tableau');
        return;
    }

    const userList = document.getElementById('users');
    const myUserDiv = document.getElementById('my-player');
    const myUser = users.find(user => user.name === username);

    userList.innerHTML = '';
    myUserDiv.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `<img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;"> <p>${user.name}</p>`;
        
        if (user.lives === 0) {
            userItem.classList.add('grayscale');
        }
        
        if (myUser === user) {
            myUserDiv.innerHTML = `<img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;"> <p>${user.name}</p>`;
        } else {
            userList.appendChild(userItem);
        }
    });

    const currentPlayerDiv = document.getElementById('current-player');
    const playersList = document.getElementById('players');

    currentPlayerDiv.innerHTML = '';
    playersList.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `
            <p>${user.lives}</p>
            <img src="./assets/${user.avatar}" alt="Avatar de ${user.name}" style="width: 100px;">
            <p>${user.name}</p>
        `;
        if (user.lives === 0) {
            userItem.classList.add('grayscale');
        }
        if (user.name === currentPlayer) {
            currentPlayerDiv.innerHTML = userItem.innerHTML;
        } else {
            playersList.appendChild(userItem);
        }
    });

    grayscaleDeadPlayers(users);
}

function grayscaleDeadPlayers(users) {
    const playersListItems = document.querySelectorAll('#players li');
    playersListItems.forEach(item => {
        const playerName = item.querySelector('p:last-of-type').textContent;
        const player = users.find(user => user.name === playerName);
        if (player && player.lives === "") {
            item.classList.add('grayscale');
        } else {
            item.classList.remove('grayscale');
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
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-10.293a1 1 0 011.414 0L10 9.586l2.293-2.293a1 1 0 111.414 1.414L10 12.414l-2.293-2.293a1 1 0 01-1.414-1.414z" clip-rule="evenodd" />
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
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.684-1.36 3.449 0l6.519 11.608c.763 1.357-.208 3.043-1.725 3.043H3.483c-1.517 0-2.488-1.686-1.725-3.043L8.257 3.099zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-.25-4a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0V9z" clip-rule="evenodd" />
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
    }, 5000); // Remove alert after 5 seconds
}

function animateWaterGun() {
    const waterGun = document.getElementById('water-gun-img');
    waterGun.style.transform = 'translateX(-20px)';
    
    setTimeout(() => {
        waterGun.style.transform = 'translateX(0)';
    }, 200);
}
