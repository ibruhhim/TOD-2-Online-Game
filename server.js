const port = 3000;
const maxPlayers = 8;
const io = require('socket.io')(port, {
    cors: {
      origin: '*',
    }
  });

let colors = [
              'red', 'blue', 'orange', 
              'lightblue', 'yellow', 'lime', 
              'green', 'violet', 'pink', 
              'white', 'gray', 'purple', 
              'brown', 'cyan', 'teal', 
              'maroon', 'crimson', 'olive', 
              'coral', 'silver', 'gold', 
              'tomato', 'yellowgreen', 'steelblue', 
              'wheat'
            ];

const rooms = new Map();
const connectedUsers = new Map();

Array.prototype.choose = function(){
  return this[Math.floor(Math.random()*this.length)];
}

function removeItem(lst, remove) {
  return lst.filter(item => item!=remove);
}

io.on('connection', socket => {

    function assignNextTurn(roomCode) {
      
      let room = rooms.get(roomCode)
      let playerIds = Array.from(room.players.keys());

      if (room.settings[1] == 'Random') {
        room.gameStats.currentTurn = playerIds.choose();
      }

      else {
        let newIndex = playerIds.indexOf(room.gameStats.currentTurn) + 1
        if (newIndex > playerIds.length - 1) {
          newIndex = 0
        }

        room.gameStats.currentTurn = playerIds[newIndex]
      }

      let turn = room.gameStats.currentTurn;
      let turnName;
    
      Array.from(room.players.values()).forEach(player => {
        if (player.id == turn) {
          turnName = player.playerName
          }
      })

      io.to(roomCode).emit('next-turn', {id: turn, name: turnName})
    }

    console.log(`${socket.id} connected to the server!`);

    socket.on('create-room', (pName, roomCode) => {

      let clientInfo = new Map();
      let pColor = colors.choose();
      let pObj = {
        playerName: pName,
        colorTag: pColor, 
        id: socket.id,
        score: 0,
      };

      clientInfo.set(socket.id, pObj);
      connectedUsers.set(socket.id, roomCode);
      rooms.set(roomCode, {
        host: socket.id,
        players: clientInfo,
        settings: ['Standard','Cycle','5'],
        colorTags: removeItem(colors, pColor),
        gameStats: {status: false, playedTurns: 0, activeRound: 1, totalVotes: 0, currentTurn: null, pointsHolder: 0}
      }
    );
      

      socket.join(roomCode);
      socket.emit('room-created', pObj, roomCode);
      console.log(`${pName} created a room called ${roomCode}!`);
    
    })


    socket.on('join-room', (pName, roomCode) => {

      console.log(rooms.has(roomCode))
      console.log(`${pName} is attempting to join room ${roomCode}......`)

      if (rooms.has(roomCode)) {
        let room = rooms.get(roomCode);
        let clients = room.players;
        let gameBusy = room.gameStats.status

        if (gameBusy) {
          return null
        }

        if (clients.size > maxPlayers-1) {
          return null
        }

   
        socket.join(roomCode);
        console.log(`${pName} joined room ${roomCode}!`);

        let pColor = room.colorTags.choose();
        room.colorTags = removeItem(room.colorTags, pColor)

        let playerObj = {
          playerName: pName,
          colorTag: pColor,
          id: socket.id,
          score: 0,
        };

        clients.set(socket.id, playerObj);
        connectedUsers.set(socket.id, roomCode);

        let allPlayers = Array.from(clients.values());

        socket.emit('roomJoined', true, allPlayers, roomCode, room.settings, playerObj);
        socket.to(roomCode).emit('playerJoined', playerObj);
      }

      else {
        socket.emit('roomJoined', false);
      }

    })

    socket.on('gameSettingsUpdate', (settings, roomCode) => {
      rooms.get(roomCode).settings = settings;
      socket.to(roomCode).emit('settingsUpdate', settings);
    })

    socket.on('start-game-request', roomCode => {
      let room = rooms.get(roomCode);
      let playerIds = Array.from(room.players.keys())
      let players = Array.from(room.players.values())


      if (players.length < 3) {
        return null
      }

      room.gameStats.status = true;

      if (room.settings[1] == 'Random') {
        room.gameStats.currentTurn = playerIds.choose();
      }

      else {
        room.gameStats.currentTurn = playerIds[0]
      }

      let turn = room.gameStats.currentTurn;
      let turnName;

      Array.from(room.players.values()).forEach(player => {
        if (player.id == turn) {
          turnName = player.playerName
        }
      })
      
      io.to(roomCode).emit('game-started', players, {id: turn, name: turnName}, room.settings);

    })

    socket.on('display-TOD', (roomCode, question) => {
      socket.to(roomCode).emit('display-question', question)
    })


    socket.on('message-sent', (roomCode, msg, msgType) => {
      socket.to(roomCode).emit('playerMessage', msg, msgType)
    })

    socket.on('points-voted', (roomCode, awardedPlayer, amount) => {
      let room = rooms.get(roomCode);
      room.gameStats.totalVotes += 1

      room.gameStats.pointsHolder += amount

      if ((room.gameStats.totalVotes % (room.players.size - 1)) == 0) {

        let pointsName;

        Array.from(room.players.values()).forEach(player => {
          if (player.id == awardedPlayer) {
            player.score += room.gameStats.pointsHolder
            pointsName = player.playerName
          }
        })

        io.to(roomCode).emit('points-announce', room.gameStats.pointsHolder, pointsName)
        io.to(roomCode).emit('refresh-board', Array.from(room.players.values()))

        room.gameStats.pointsHolder = 0
        room.gameStats.playedTurns += 1


        if (room.gameStats.playedTurns % room.players.size == 0) {
          room.gameStats.activeRound += 1

          if (room.gameStats.activeRound > parseInt(room.settings[2])) {
            io.to(roomCode).emit('game-win', Array.from(room.players.values()))
          }
  
          io.to(roomCode).emit('update-round', room.gameStats.activeRound)
        }

        assignNextTurn(roomCode);
      }

    })


    socket.on('disconnect', () => {

      console.log('Someone is disconnecting....');

      let roomCode = connectedUsers.get(socket.id);
      let activeRoom = rooms.has(roomCode);
      
      if (!activeRoom) {
        return null
      }

      let room = rooms.get(roomCode)
      let clients = rooms.get(roomCode).players

      console.log(`${clients.get(socket.id).playerName} disconnected from the server!`);


      connectedUsers.delete(socket.id);
      if (activeRoom) {
        if (socket.id == room.host) {
          rooms.delete(roomCode);
          socket.to(roomCode).emit('shutdownRoom');
        }

        else {

          room.colorTags.push(clients.get(socket.id).colorTag);



          if (!room.gameStats.status) {
            clients.delete(socket.id);
            socket.to(roomCode).emit('playerLeft', Array.from(room.players.values()));
          }

          
          if (room.gameStats.status) {

            if (socket.id == room.gameStats.currentTurn) {
              assignNextTurn(roomCode)
            }
            
            let pName;
            
            Array.from(room.players.values()).forEach(player => {
              if (player.id == socket.id) {
                pName = player.playerName
              }
            })

            clients.delete(socket.id);
            socket.to(roomCode).emit('refresh-board', Array.from(room.players.values()))
            socket.to(roomCode).emit('left-active-game', pName)

            if (room.players.size < 2) {
              io.to(roomCode).emit('game-win', Array.from(room.players.values()))
            }
          }
        }
      }
    });
});

console.log(`Server listening on port ${port}`);