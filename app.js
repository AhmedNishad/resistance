var express = require('express');
var app = new express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var allClients = []

var asyncFunc = ()=>{

}

max_players = 8;

let calcSpies = (playerCount)=>{
    return Math.floor(playerCount/2 - 1)
}

let isMajority = (val, from)=>{
    //console.log(Math.floor(from/2) + " , " + val);
    if(Math.floor(from/2) < val){
        return true;
    }else{
        return false;
    }
}

function shuffle(a) {
    let n = [...a];
    for (let i = n.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [n[i], n[j]] = [n[j], n[i]];
    }
    return n;
}

let nominatedLast = 0;

//, , 'dino', 'adee'
state = {
    players: [],
    number_online: 0,
    spies_count: 0,
    round: 1,
    round_operatives: [2,3,4,3,4],
    resistance_count: 0,
    wins: 0,
    resistance_win: 0,
    current_mission: {
        pass: 0,
        fail: 0
    },
    nominations: [],
    nominator: 'jana',
    votesFor : 0,
    votesAgainst: 0,
    ready: 0
}

app.use(express.static('public'))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket){
  
  state.number_online++;
  socket.on('disconnect', e=>{
      if(socket.playerName){
        var i = allClients.indexOf(socket);
        console.log(i)
        let player = state.players[i];
        state.players = state.players.filter(p => p != player);
        state.ongoing = false;
        console.log(player + " has disconnected");
        io.emit("disconnect", `${player} has disconnected`);
        clearInterval(asyncFunc);
        state.round = 0;
        state.wins = 0;
        setTimeout(()=>{
            io.emit('player_join', {
                players: state.players
            });
        }, 1000)
        
      }
      
      if (i === -1)return;
      allClients.splice(i,1);
  })

  socket.on('join_game', player=>{
      allClients.push(socket);
      if(state.players.length > max_players){
          socket.emit('room_full', "Game is full")
          return;
      }

      if(state.players.includes(player)){
        socket.emit('room_full', "Player already exists")
        return;
      }

      if(state.ongoing){
        socket.emit('room_full', "Game is ongoing, wait for it to end");
        return;
      }
      socket.playerName = player;
      state.players.push(player);
      io.emit('player_join', {
          players: state.players
      });
  })

  socket.on('start_game', e=> {
      state.ready += 1;
      if(state.ready == state.players.length){
          console.log("Game starting");
          let spies = shuffle(state.players).slice(0,calcSpies(state.players.length));
          io.emit('game_start', {
              spies,
              players: state.players
          });
          asyncFunc = setTimeout(()=>{
            io.emit('get_nominations', state.players[nominatedLast]);
            }, 3500);
          // change to 0
          state.ready = 0;
          state.ongoing = true;
      }
  })

  socket.on('confirmRole', e=>{
      state.ready++;
      if(state.ready == state.players.length){
        state.ready = 0;
        io.emit('get_nominations', state.players[nominatedLast]);
      }
  })

  socket.on('nominations', function(nominations){
    io.emit("nominated", nominations)
    state.nominations = nominations;
    if(nominatedLast < (state.players.length-2)){
        nominatedLast++;
    }else{
        nominatedLast = 0;
    }
  })

  socket.on('vote', v=>{
      if(v){
          state.votesFor += 1;
      }else{
          state.votesAgainst += 1;
      }
      let totalVotes = state.votesFor + state.votesAgainst;
      if(totalVotes == state.players.length){
          if(isMajority(state.votesFor, state.players.length)){
              io.emit('voting_completed', {
                success: true,
                operatives: state.nominations
              })
          }else{
            io.emit('voting_completed', {
                success: false,
                next: state.players[nominatedLast]
              })
          }
          state.votesFor = 0;
          state.votesAgainst = 0;
      }
  })

  socket.on("pass_mission", e=>{
      let {current_mission, round_operatives, round} = state;
      if(e){
        state.current_mission.pass += 1;
      }else{
        state.current_mission.fail += 1;
      }
      let totalOutcomes = current_mission.pass + current_mission.fail;
      if(totalOutcomes == round_operatives[round - 1]){
          let passed = true; 
          if(round_operatives[round - 1] == 4 && current_mission.fail > 1)
            passed = false;
            if(round_operatives[round - 1] < 4 && current_mission.fail > 0)
            passed = false;
          if(passed){
              state.wins++;
          }
          state.round++;
          io.emit('mission_complete', {
            success: passed,
            round: state.round,
            wins: state.wins
        })
        asyncFunc = setTimeout(()=>{
            io.emit('get_nominations', state.players[nominatedLast]);
        }, 3500);
        state.current_mission.pass = 0;
        state.current_mission.fail = 0;
      }

      // If it goes to majority need to check that

      let _wins = state.wins;
      let _rounds = state.round;
      let _losses = Math.abs(_wins - (_rounds - 1));
      // If it goes 2- 2
      if(_rounds == 5 || isMajority(_wins, 5) || isMajority(_losses, 5)){
          let won = true;
          state.ongoing = false;
          state.players = [];
          allClients = []
          if(isMajority(_wins, 5)){
            won = true;
          }
          if(isMajority(_losses, 5)){
              won = false;
          }
          io.emit("game_end",{
              wins: state.wins,
              won,
              rounds: _rounds
          });
          state.round = 1;
          state.wins = 0;
          clearInterval(asyncFunc)
      }
  })

  socket.on('play_again', player=>{
      socket.playerName = player;
      if(state.ongoing){
          socket.emit('room_full', "Game is ongoing, wait for it to end");
          return;
        }
        allClients.push(socket)
        state.players.push(player);
        socket.emit('start_again', null)
        io.emit('player_join', {
            players: state.players
        })
  })
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});