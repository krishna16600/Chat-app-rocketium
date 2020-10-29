const http = require('http');
const express = require('express');
const body_parser = require('body-parser');
const path = require('path');
const socketIO = require('socket.io');
const app = express()
require('dotenv').config();
const server = http.createServer(app);
const io = socketIO(server);

//setting up EJS as templating engine
app.set('view engine', 'ejs');
app.use(body_parser.json());
app.use(express.static(path.join(__dirname, './public')));
app.use(body_parser.urlencoded({ extended: true}));
app.set("views", __dirname + '/views');


let currentAdmin = '';
let currentAdminPicture = '';
let isRoomCreated = false;
let roomMembers = [];
let roomMessages = [];



io.on('connection', (socket) => {

    console.log('New user connected');
    //When a user joins in for the first time
    socket.on('createRoom', (newRoom) => {
        console.log(newRoom);
        isRoomCreated = true;
        currentAdmin = newRoom.roomAdmin;
        currentAdminPicture = newRoom.roomAdminPicture;
        io.emit('redirectToChat');
    })
    
    //Sending a new message in chat
    socket.on('broadcastMessage', (message) => {
        roomMessages.push(message);
        io.emit('newMessageRecieved',{
            ...message
        });
    });

    //when admin leaves the chat
    socket.on('destroyRoom', () => {
        console.log("requested room exit");
        isRoomCreated = false;
        currentAdmin = '';
        currentAdminPicture = '';
        roomMessages = [];
        roomMembers = roomMembers.filter((name) => name!==currentAdmin);
        io.emit('redirectToAvatar')
    });

    //when user disconnects
    socket.on('destroy', () => {
        console.log('User left the chat!');
    })
})

//avatar middleware
function avatarMiddlewareCheck(req, res, next){
    if(!isRoomCreated){
        next();
    } else if(!checkUserPresent(req.params.username)){
        res.redirect('/');
    }else{
        res.redirect('/chat-room/'+req.params.username);
    }
}

function checkUserPresent(username){
    if(!roomMembers.includes(username))
        return false;
    return true;
}

function chatRoomMiddleware(req, res, next) {
    if(isRoomCreated){
        next();
    } else if(!checkUserPresent(req.params.username)){
        res.redirect('/');
    }else{
        res.redirect('/avatar-selection/'+req.params.username);
    }
}

function checkIfUserAlreadyPresent(username){
   return roomMembers.filter((memberName) => memberName===username);    
}

app.get('/' , (req, res) => {
    res.render('home');
})
app.post('/registerUser', (req, res) => {
    if(req.body.name!=null || req.body.name!==''){
        if(checkIfUserAlreadyPresent(req.body.name)){
            roomMembers.push(req.body.name);
            res.send("access");
        } else {
            res.redirect('/');
            res.send("declined")
        }
    }
})
app.get('/avatar-selection/:username', avatarMiddlewareCheck, (req, res) => {
    res.render('Avatar', {
        username: req.params.username
    })
})

app.get('/chat-room/:username', chatRoomMiddleware, (req, res) => {
    if(currentAdmin!=null){
        let isAdmin = currentAdmin===req.params.username;
        res.render('chat_room', {
            username: req.params.username,
            isRoomAdmin: isAdmin,
            roomAdmin: currentAdmin,
            avatar: currentAdminPicture,
            roomMessages
        })
    }
})
//Port availability
server.listen(process.env.PORT,  (err) => {
    if (err)
        console.log(`Error in finding running server at port ${process.env.PORT}`);
    else
        console.log(`Server up and running at port ${process.env.PORT}`)
})
