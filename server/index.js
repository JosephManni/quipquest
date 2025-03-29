const io = require('socket.io')(3000, {
    cors: {
        origin: "http://localhost:81", 
        methods: ["GET", "POST"]
    }
});

const rooms = {};
const roomTimers = {};

function generateRoomCode() {
    let roomCode;
    do {
        roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    } while (rooms[roomCode]); // Ensure room code is unique
    return roomCode;
}

function generatePlayerId() {
    return Math.random().toString(36).substring(2, 10);
}

io.on('connection', (socket) => {

    // Generate player ID
    socket.on('generate-player-id', () => {
        socket.emit('player-id-generated', generatePlayerId());
    });

    // Handle room creation
    socket.on('create-room', () => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [],
            // players: [{ id: playerId, socketId: socket.id, name: playerName }],
            leader: null
        };

        socket.join(roomCode);
        socket.emit('room-created', { roomCode });

        io.to(roomCode).emit('player-joined', { players: rooms[roomCode].players, leader: rooms[roomCode].leader });
    });

    // Handle player joining a room
    socket.on('join-room', (roomCode, playerName, playerId = generatePlayerId()) => {
        if (rooms[roomCode]) {
            const playerExists = rooms[roomCode].players.some(player => player.id === playerId);

            if (playerExists) {
                rooms[roomCode].players = rooms[roomCode].players.map(player => {
                    if (player.id === playerId) {
                        player.socketId = socket.id;
                        player.name = playerName;
                    }
                    return player;
                });
            }
            //if player is admin then do nothing
             else if (playerId === 'admin') {
                //do nothing, just is
             }
            
            else {
                rooms[roomCode].players.push({ id: playerId, socketId: socket.id, name: playerName });
            }

            // Assign leader if no leader is set
            if (!rooms[roomCode].leader) {
                rooms[roomCode].leader = playerId;
            }

            socket.join(roomCode);
            io.to(roomCode).emit('player-joined', { players: rooms[roomCode].players, leader: rooms[roomCode].leader });
            console.log(`Updated players in room after ${playerName} joined:`, rooms[roomCode].players);

            if (roomTimers[roomCode]) {
                clearTimeout(roomTimers[roomCode]);
                delete roomTimers[roomCode];
            }
        } else {
            socket.emit('room-not-found', 'Room does not exist');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
        for (const roomCode in rooms) {
            const playerIndex = rooms[roomCode].players.findIndex(player => player.socketId === socket.id);
            if (playerIndex !== -1) {
                const playerId = rooms[roomCode].players[playerIndex].id;
                rooms[roomCode].players.splice(playerIndex, 1);

                // Check if the disconnected player was the leader
                if (rooms[roomCode].leader === playerId) {
                    rooms[roomCode].leader = rooms[roomCode].players.length > 0 ? rooms[roomCode].players[0].id : null;
                }

                io.to(roomCode).emit('player-left', { players: rooms[roomCode].players, leader: rooms[roomCode].leader });

                if (rooms[roomCode].players.length === 0) {
                    roomTimers[roomCode] = setTimeout(() => {
                        console.log(`Deleting room ${roomCode} after 60 seconds of inactivity`);
                        delete rooms[roomCode];
                        delete roomTimers[roomCode];
                    }, 60000);
                }

                
            }
        }

    });

    // Handle rejoin
    socket.on('rejoin-room', (roomCode, playerName, playerId) => {
        if (rooms[roomCode]) {
            const playerExists = rooms[roomCode].players.some(player => player.id === playerId);
            if (!playerExists) {
                rooms[roomCode].players.push({ id: playerId, socketId: socket.id, name: playerName });
            } else {
                rooms[roomCode].players = rooms[roomCode].players.map(player => {
                    if (player.id === playerId) {
                        player.socketId = socket.id;
                    }
                    return player;
                });
            }

            // Assign leader if no leader is set
            if (!rooms[roomCode].leader) {
                rooms[roomCode].leader = playerId;
            }

            socket.join(roomCode);
            io.to(roomCode).emit('player-joined', { players: rooms[roomCode].players, leader: rooms[roomCode].leader });

            if (roomTimers[roomCode]) {
                clearTimeout(roomTimers[roomCode]);
                delete roomTimers[roomCode];
            }
        } else {
            socket.emit('room-not-found', 'Room does not exist');
        }
    });
});
