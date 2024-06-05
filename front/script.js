let room = '';
let socketid = '';
const roomArea = document.querySelector('#room');
const messageArea = document.querySelector('#message');
const socket = io('http://localhost:3000');
socket.on('connect', () => {
    console.log('Connected');
});
socket.on('message', (data) => {
    console.log(data);
    document.querySelector('.data').innerText = data;
});
socket.on('disconnect', () => {
    console.log('Disconnected');
});

let send = () => {
    console.log(messageArea.value);
    //socket.emit('message', `message : ${messageArea.value}`);
    socket.emit('room', roomArea.value, `Message room ${roomArea.value} : ${messageArea.value}`);
}
roomArea.addEventListener('change', (e) => {
    socket.emit('leave', room);
    socket.emit('join', e.target.value);
    room = e.target.value;
});