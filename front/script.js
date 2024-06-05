const socket = io('http://localhost:3000');
    let roomCode = '';
    let username = '';

    socket.on('connect', () => {
        console.log('Connected');
    });

    socket.on('message', (data) => {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = data;
        document.getElementById('messages').appendChild(messageDiv);
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
        alert('Room is full. Please try another room.');
    });

    socket.on('room created', (code) => {
        roomCode = code;
        document.getElementById('room-code').textContent = roomCode;
        document.getElementById('room-code-display').style.display = 'block';
    });

    function createRoom() {
        username = document.getElementById('username').value;
        if (username) {
            socket.emit('create room', username);
            document.getElementById('create-room').style.display = 'none';
            document.getElementById('join-room').style.display = 'none';
            document.getElementById('chat-room').style.display = 'block';
        } else {
            alert('Please enter a username.');
        }
    }

    function joinRoomWithCode() {
        const joinRoomCode = document.getElementById('join-room-code').value;
        const joinUsername = document.getElementById('join-username').value;
        if (joinRoomCode && joinUsername) {
            roomCode = joinRoomCode;
            username = joinUsername;
            socket.emit('join room', joinRoomCode, joinUsername);
            document.getElementById('create-room').style.display = 'none';
            document.getElementById('join-room').style.display = 'none';
            document.getElementById('chat-room').style.display = 'block';
            document.getElementById('room-code').textContent = roomCode;
        } else {
            alert('Veuillez compléter tous les champs.');
        }
    }

    function sendMessage() {
        const messageInput = document.getElementById('message-input');
        if (messageInput.value) {
            socket.emit('room message', roomCode, `${username}: ${messageInput.value}`);
            messageInput.value = '';
        }
    }