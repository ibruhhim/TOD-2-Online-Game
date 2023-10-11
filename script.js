const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to the server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from the server');
  
});


let dares;
let truths;
let chat;
let msgInput;
let pColumn;
let turnOutput;
let chooseTurn;
let turnBox;
let me;
let turn;
let roomCode;
let modes;
let turnTakes;
let pList;
let rounds;
let mode;
let codeBox;
let turnType;
let playerCount;
let roundCount;
const lobbyPage = `  
  <div class='container'>
    <div id='settings'>
      <div><span>Turns:</span><button onclick="optionsCycle(-1, turnTakes, turnType)">&lt;</button><span id='turns'>Cycle</span><button onclick="optionsCycle(1, turnTakes, turnType)">&gt;</button></div>
      <div><span>Mode:</span><button onclick="optionsCycle(-1, modes, mode)">&lt;</button><span id='gamemode'>Standard</span><button onclick="optionsCycle(1, modes, mode)">&gt;</button></div>
      <div><span>Rounds:</span><button onclick="roundsChange(-1)">&lt;</button><span id='rounds'>5</span><button onclick="roundsChange(1)">&gt;</button></div>
      <div id='code'>Room: <span>YMZX</span></div>
    </div>
    <div id='vertical-bar'></div>
    <div id='player-list'>
      
      <div id="in-list">
      </div>
      
      <div id='start-btn-box'><div><span>1</span>/8</div><button onclick="startGame()">Start</button></div>
    </div
      
  </div>
  `

  const gamePage = `
  
  <div class='game-content'>
    
    <div id='player-column'></div>

    <div id='game-box'>

      <div id='round-count'></div>

      <div id='TOD-box'>
        <div id='turn-announcement'></div>

        <div id='TOD-output'></div>
        
        <div id='TOD-choice'>

        </div>
        

        
      </div>
      
      
      <div id='points'>
        <button onclick="votePoints(0)">0</button>
        <button onclick="votePoints(1)">1</button>
        <button onclick="votePoints(2)">2</button>
        <button onclick="votePoints(3)">3</button>
        <button onclick="votePoints(4)">4</button>
      </div>

    </div>

    <div id='chat-box'>
      
      <div id='chat'>
      </div>
      
      <div id='send-chat'>
        <input placeholder="Enter your message here...">
      </div>
      
    </div>
  
</div>
`

Array.prototype.choose = function(){
  return this[Math.floor(Math.random()*this.length)];
}




async function getName() {
  numbers = [];
  for (i = 4; i < 11; i ++) {
    numbers.push(i)
  }

  return fetch(`https://random-word-api.herokuapp.com/word?length=${numbers.choose()}`)
  .then(response => response.json())
  .then(obj => obj[0])

};



function optionsCycle(n, lst, docObj) {
  let len = lst.length;
  let number = lst.indexOf(docObj.innerHTML);
  if (n < 0 && number < 1) {
    number = lst.length
  }
  
  if (n > 0 && number > len - 2) {
    number = -1
  }
  
  docObj.innerHTML = lst[number+n]
  sendGameSettings();
}

function roundsChange(n) {
  let number = parseInt(rounds.innerHTML);
  let maxRounds = 20;
  let minRounds = 3;
  rounds.style.color = 'white';
  if ((n < 0 && number < minRounds + 1) || (n > 0 && number > maxRounds - 1)) {
    rounds.style.color = 'red';
    return null
  }
  
  rounds.innerHTML = number + n
  sendGameSettings();
}

function sendGameSettings() {
  gamemode = mode.innerHTML;
  turns = turnType.innerHTML;
  totalRounds = rounds.innerHTML;
  socket.emit('gameSettingsUpdate', [gamemode, turns, totalRounds], roomCode)
}

function fillPlayerList() {
  
  for (let i = 1; i < 9;  i ++) {
    let newTag = document.createElement('div');
    newTag.innerHTML = `${i}. <span class="no-player">${'.'.repeat(14)}</span>`
    pList.appendChild(newTag)
  }
}


function addPlayerList(pObj) {

  let meHead = ''
  if (pObj.id == me.id) {
    meHead += ' ★'
  }

  console.log(pObj)
  Array.from(pList.children).every(child => {
    
    let tag = child.querySelector('span');
    if (tag.className == "no-player") {
      tag.remove();
      let newTag = document.createElement('span');
      newTag.innerHTML = pObj.playerName + meHead;
      newTag.style.color = pObj.colorTag;
      child.appendChild(newTag);

      return false;
    }
    return true;
  })

}

function todButtons() {
  let truthButton = `<button onclick="displayQuestion(getTruth(), 'truth')">Truth</button>`
  let dareButton = `<button onclick="displayQuestion(getDare(), 'dare')">Dare</button>`

  if (mode.innerHTML == 'Standard') {
    return truthButton + `<span>OR</span>` + dareButton
  }

  if (mode.innerHTML == 'Only Truths') {
    return truthButton + `<span>OR</span>` + truthButton
  }

  if (mode.innerHTML == 'Only Dares') {
    return dareButton + `<span>OR</span>` + dareButton
  }
}

function updateSettings(settings) {
  let [gamemode, turns, totalRounds] = settings;
  mode.innerHTML = gamemode;
  turnType.innerHTML = turns;
  rounds.innerHTML = totalRounds;
}

function reloadPlayerList(playerList) {
  Array.from(pList.children).forEach(child => {
    let tag = child.querySelector('span');
    tag.innerHTML = '.'.repeat(14)
    tag.classList.add("no-player");
    tag.style.color = 'white';
  })

  playerList.forEach(player => {
    addPlayerList(player);
  })

}

function loadLobby() {
  document.getElementById('page-content').innerHTML = lobbyPage;
  modes = ['Standard', 'Only Dares', 'Only Truths'];
  turnTakes = ['Cycle', 'Random'];
  pList = document.getElementById('in-list');
  rounds = document.getElementById('rounds');
  mode = document.getElementById('gamemode');
  turnType = document.getElementById('turns');
  codeBox = document.getElementById('code').querySelector('span');
  playerCount = document.getElementById('start-btn-box').querySelector('span');
}


async function createRoom() {

  let room = (Math.random() + 1).toString(36).substring(8);
  socket.emit('create-room', await getName(), room); 
}

socket.on('room-created', (pObj, room) => {

  me = pObj;
  loadLobby();
  fillPlayerList();
  addPlayerList(pObj);
  roomCode = room;
  codeBox.innerHTML = room;
  codeBox.addEventListener('click', () => navigator.clipboard.writeText(room))

})

async function joinRoom() {
  let room = document.getElementById('join-room').querySelector('input').value
  socket.emit('join-room', await getName(), room);

}

async function loadTOD() {
  await fetch('tod.json')
  .then(response => response.json())
  .then(data => {
    dares = data['dares']
    truths = data['truths']
  });

}

function getDare() {

  return dares.choose()
}

function getTruth() {

  let tags = ['dirty', 'friendly', 'embarrassing', 'socially_awkward']
  return truths[tags.choose()].choose()
}


function displayTOD(question) {
  socket.emit('display-TOD', roomCode, question)
}

function displayQuestion(question, tod) {

  displayTOD(question);
  turnOutput.innerHTML = question;
  chooseTurn.innerHTML = `<button onclick="tryAgain('${tod}')"><i class="material-icons">refresh</i></button>`;
}

function announceTurn(name) {
  turnBox.innerHTML = `It's ${name}'s Turn<span>.</span><span>.</span><span>.</span>`
}

function tryAgain(tod) {

  chooseTurn.innerHTML = ''
  let func = {dare: getDare, truth: getTruth}[tod]
  let question = func()
  turnOutput.innerHTML = question
  displayTOD(question)

}

function addChat(message, request={type: 'server', pObj: null}) {
  let newMsg = document.createElement('div');
  if (request.type == 'server') {
    newMsg.setAttribute("id", 'server-msg')
    newMsg.innerHTML = message;
  }

  else {
    newMsg.innerHTML = `<span style="color: ${request.pObj.colorTag}">${request.pObj.playerName}:</span> ${message}`
  }
  
  chat.appendChild(newMsg);
  
}


function sendMsg() {
  let msgType = {type: 'player', pObj: me};
  addChat(msgInput.value, msgType);
  socket.emit('message-sent', roomCode, msgInput.value, msgType);
}



function addPlayerColumn(pObj) {

  let {playerName, colorTag, id, score} = pObj;

  let meHead = '';
  if (id == me.id) {
    meHead += ' ★'
  };

  let slide = document.createElement('div');
  slide.setAttribute('id', 'player-slide');
  
  let number = pColumn.childElementCount + 1
  let playerNum = document.createElement('div');
  playerNum.setAttribute('id', 'player-num');
  playerNum.innerHTML = `#${number}`

  let stats = document.createElement('div');
  stats.setAttribute('id', 'player-stats')
  stats.innerHTML = `<div style="color: ${colorTag}">${playerName}${meHead}</div> <div>Score: ${score}</div>`

  slide.appendChild(playerNum);
  slide.appendChild(stats);
  pColumn.appendChild(slide);

}

function setColumns(pList) {
  pColumn.innerHTML = ''

  pList.forEach(player => {
    addPlayerColumn(player);
   })
}

function loadGameLobby() {
  document.getElementById('page-content').innerHTML = gamePage;
  chat = document.getElementById('chat');
  msgInput = document.getElementById('send-chat').querySelector('input');
  pColumn = document.getElementById('player-column');
  turnOutput = document.getElementById('TOD-output');
  chooseTurn = document.getElementById('TOD-choice');
  turnBox = document.getElementById('turn-announcement');
  roundCount = document.getElementById('round-count');
  roundCount.innerHTML = `<span>1</span>/${rounds.innerHTML}`

  msgInput.addEventListener('keydown', event => {
    if (event.key == 'Enter') {
      sendMsg();
      msgInput.value = '';
    }
  })

}

function startGame() {
  socket.emit('start-game-request', roomCode);
}


function votePoints(points) {

  let pointsBox = document.getElementById('points')
  socket.emit('points-voted', roomCode, turn, points)

  pointsBox.querySelectorAll('button').forEach(button => {
    button.disabled = true;
  })

}


function readyTurn() {

  let choiceBox = document.getElementById('TOD-choice')
  let pointsBox = document.getElementById('points')

  console.log(`Your turn is ${me.id == turn}!`)
  choiceBox.querySelectorAll('button').forEach(button => {
    button.disabled = (me.id != turn);
  })

  pointsBox.querySelectorAll('button').forEach(button => {
    button.disabled = !(me.id != turn);
  })
}

socket.on('game-started', (playerList, currentTurn, settings) => {

  loadGameLobby();
  turn = currentTurn.id
  setColumns(playerList)
  announceTurn(currentTurn.name)
  chooseTurn.innerHTML = todButtons();
  readyTurn()
  
})

socket.on('playerMessage', (msg, msgType) => {
  addChat(msg, msgType);
})

socket.on('roomJoined', (status, playerList, room, settings, pObj) => {

  me = pObj;

  if (status) {
    loadLobby();
    fillPlayerList();
    document.querySelectorAll('button').forEach(button => {
      button.disabled = true;
    })

    roomCode = room;
    playerList.forEach(player => {
      addPlayerList(player);
     })

    codeBox.innerHTML = room;
    updateSettings(settings);

    playerCount.innerHTML = playerList.length;
    codeBox.addEventListener('click', () => navigator.clipboard.writeText(room))
  }

  else {
    return null
  }
}) 

socket.on('playerJoined', pObj => {
  addPlayerList(pObj);
  playerCount.innerHTML = parseInt(playerCount.innerHTML) + 1
  console.log(`${pObj.playerName} joined the game!`)
})

socket.on('refresh-board', players => {
  players.sort((a, b) => b.score - a.score)
  setColumns(players)
})

socket.on('next-turn', currentTurn => {

  turnOutput.innerHTML = ''
  chooseTurn.innerHTML = todButtons();
  turn = currentTurn.id;
  readyTurn();
  announceTurn(currentTurn.name)

})


socket.on('settingsUpdate', settings => {
  updateSettings(settings);
})


socket.on('playerLeft', playerList => {
  reloadPlayerList(playerList);
  playerCount.innerHTML = playerList.length
})

socket.on('game-win', players => {
  players.sort((a, b) => b.score - a.score)
  let win = players[0]
  document.getElementById('page-content').innerHTML = `$<div id="winner"><div id="win-crown">👑</div><div style="color:${win.colorTag};">${win.playerName}</div> wins!</div>`;
})

socket.on('shutdownRoom', () => {
  alert('Host has left the game, you will shortly be disconnected....');
  setTimeout(() => {
    window.location = window.location.href;
  }, 1000);

})

socket.on('left-active-game', leftName => {
  addChat(`${leftName} disconnected!`)
})

socket.on('update-round', round => {
  roundCount.querySelector('span').innerHTML = round
})

socket.on('points-announce', (points, pointsName) => {
  addChat(`${pointsName} gained ${points} points!`)
})

socket.on('display-question', question => {
  turnOutput.innerHTML = question;
  chooseTurn.innerHTML = ''
})

loadTOD();