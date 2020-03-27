const socket = io();

let joined = false;
let startedGame = false;
let userName = '';

const container = document.getElementById('stage');
const message = document.getElementById('message')
// Stages

/* before joining, assign roles, reveal spies, nominate operatives, vote, mission, mission outcome, end game  */

// Manage the local state of the game

// Properties : these need to sync up with global state : single source of truth, on changes logic operates on 
// backend and returns the new state of the game
/*
 Joined indicates whether client has joined an ongoing game
 Stage : indicates the ongoing action, apart from prejoin everyones state needs to sync up
*/

let state = {
    number_online: 0,
    spies_count: 0,
    round: 1,
    round_operatives: [2,3,4,3,4],
    resistance_count: 0,
    spies_win: 0,
    resistance_win: 0,
    current_mission: {

    },
    nominations: [],
    nominator: 'jana',
    players: [],
    stage: 'prejoin',
    assignedRole: '',
    assignedRoleImg : '',
}

function joinGame(){
    userName = document.getElementById('username').value;
    socket.emit('join_game', userName);
    joined = true;
    state.stage = 'pregame';
    renderStage();
}

function startGame(){
    showChild(null, container);
    message.innerText = "Waiting for everyone to start";
    startedGame = true;
    socket.emit("start_game", userName);
}

socket.on("start_again", e=>{
    joined = true;
    state.stage = 'pregame';
    renderStage();
})

socket.on("player_join", e=>{
    
    if(state.stage == 'end_game')
        return;
    
    message.innerText = ""
    console.log("Player joined " + e.players)
    if(!joined){
        message.innerText = "Online: " + e.players.length;
    }else if(state.stage = 'pregame'){
       // e.players.forEach(p => {message.innerText += '| ' + p;})
       let otherPlayers = e.players.map(p => 
        {
            if(p != userName){
                return p;
            }else{
                return "You"
            }
        });
        message.innerText += otherPlayers + " are online. \n"
    }
    if(state.stage == 'pregame'){
        if(e.players.length < 5){
            document.getElementById('startBtn').disabled = true;
            message.innerText += "" + (5 - e.players.length) + " players needed";
        }else{
            document.getElementById('startBtn').disabled = false;
        }
    }
    renderStage();
})

socket.on("room_full", e=>{
    message.innerText = e;
    showChild('join-room', container);
    joined = false;
})

socket.on("timeout", e=>{
    message.innerText("Game session expired due to inactivity");
    state.stage = 'pregame';
    startGame = false;
    renderStage()
})

socket.on('game_start', e=>{
    console.log("starting game");
    if(!joined)
        return;
    //console.log(e.spies);
    message.innerText = ""
    state.stage = 'assign_roles';
    state.round = 1;
    //e.spies = ["imad", "trevin" ,"hari"];
    state.players = e.players;
    state.round_operatives = e.operatives
    if(e.spies.includes(userName)){
        randomizeCard('s');
        let otherSpies = e.spies.filter(s => s != userName)
        message.innerText = "Other spies are " + otherSpies;
        //e.spies.forEach(s => { message.innerText += " " + s })
    }else{
        randomizeCard('r');
    }
    renderStage();
})

function confirmRole(){
    if(!joined)
        return;
    socket.emit('confirmRole');
    showChild(null, container);
    message.innerText = "Await game start";
}

socket.on('get_nominations', (e)=>{
    if(!joined)
        return;
    message.innerText = "";
    state.nominator = e;
    nominateOperatives();
})

let addNomination = e => {
    let opCount = state.round_operatives[state.round - 1];
    let nom = e.target.innerText
    if(state.nominations.includes(nom)){
        let i = state.nominations.indexOf(nom)
        state.nominations.splice(i, 1);
        e.target.classList.remove('selected')
    }else{
        let maxOperatives = state.round_operatives[state.round - 1] 
        if(state.nominations.length == maxOperatives)
            return
        state.nominations.push(nom);
        e.target.classList.add('selected')
    }
    if(state.nominations.length == opCount){
        document.getElementById('nomianateBtn').disabled = false;
    }else{
        document.getElementById('nomianateBtn').disabled = true;
    }
}

function nominateOperatives(){
    document.getElementById('nomianateBtn').disabled = true;
    state.stage = 'nominate';
    state.operatives = []
    let opCount = state.round_operatives[state.round-1]
    if(state.nominator == userName){
        let cont = document.getElementById('nominate-operatives-nominator');
        removeListenersAndClearChildren(cont, addNomination);
       // cont.innerHTML =  "<button id='nomianateBtn' disabled onclick='submitNomination()' class='button is-primary'>Nominate Operatives</button> <br>";
        message.innerText = `Select ${opCount} players for mission`
        state.players.forEach(p => {
            if(p == userName)
                return;
            let playerCard = document.createElement('div');
            playerCard.classList.add('card');
            playerCard.addEventListener('click', addNomination);
            playerCard.innerText = p
            cont.appendChild(playerCard);
        })
        showChild('nominate-operatives-nominator', document.getElementById('nominate-operatives'))
    }else{
        message.innerText += state.nominator += " is nominating";
        fetch("https://meme-api.herokuapp.com/gimme/dankmemes/2").then(r=> r.json()).then(d => 
        document.getElementById('meme').src = d.memes[0].url ).catch(e=> console.log(e));
        showChild('nominate-operatives-voters', document.getElementById('nominate-operatives'))
    }
    renderStage();
}

function submitNomination(){
    socket.emit('nominations', state.nominations)
    renderStage();
}

socket.on("nominated", (e)=>{
    if(!joined)
        return;
    message.innerText = "Proposed Operatives"
    state.stage = "voting";
    let cont = document.getElementById('vote');
    removeListenersAndClearChildren(cont, null);
    //cont.innerHTML = "<button onclick='voteFor()' class='button is-success'>Accept</button> <button onclick='voteAgainst()' class='button is-danger'>Reject</button>"
    e.forEach(p => {
        let playerCard = document.createElement('div');
            playerCard.classList.add('card');
            playerCard.innerText = p;
            cont.appendChild(playerCard);
    })
    renderStage();
})

function voteFor(){
    socket.emit("vote", true);
    message.innerText = "Waiting for others";
    try {
        document.getElementById('meme2').style.display = 'block';
        fetch("https://meme-api.herokuapp.com/gimme/dankmemes/2").then(r=> r.json()).then(d => 
            document.getElementById('meme2').src = d.memes[0].url ).catch(e=> console.log(e));
        setTimeout(() => { document.getElementById('meme2').style.display = 'none';}  ,10000)
    } catch (error) {
        console.log(error);
    }
    
    showChild(null, container);
}

function voteAgainst(){
    socket.emit("vote", false);
    message.innerText = "Waiting for others";
    try {
        document.getElementById('meme2').style.display = 'block';
        fetch("https://meme-api.herokuapp.com/gimme/dankmemes/2").then(r=> r.json()).then(d => 
            document.getElementById('meme2').src = d.memes[0].url ).catch(e=> console.log(e));
    } catch (error) {
        console.log(error);
    }
    
    showChild(null, container);
}

let passMission = (e)=>{
    e.target.removeEventListener('click', passMission);
    e.target.nextElementSibling.removeEventListener('click',failMission);
    socket.emit('pass_mission', true);
    message.innerText = "Wait for other comrades";
}

let failMission = (e)=>{
    e.target.removeEventListener('click', failMission);
    e.target.previousElementSibling.removeEventListener('click', passMission);
    socket.emit('pass_mission', false);
    message.innerText = "Wait for other comrades";
}

socket.on("voting_completed", e=>{
    if(!joined)
        return;
    document.getElementById('meme2').style.display = 'none';
    let cont = document.getElementById('mission');
    if(e.success){
        console.log(e.operatives + userName);
        // Continue to mission
        if(e.operatives.includes(userName)){
            message.innerText = "You are on mission"
            cont.innerHTML = "";
            showChild(null, container);
            let passImage = document.createElement('img');
            passImage.src = randomizeCard('r');
            passImage.classList.add('image');
            passImage.addEventListener('click', passMission);
            let failtImage = document.createElement('img');
            failtImage.src = randomizeCard('s');
            failtImage.classList.add('image');
            failtImage.addEventListener('click', failMission);
            cont.appendChild(passImage)
            cont.appendChild(failtImage)
            
        }else{
            message.innerText = "";
            //e.operatives.forEach(o => {  message.innerText +=  ' | ' + o + ' | '});
            message.innerText += e.operatives + " are going on mission";
            showChild(null, cont)
            try {
                document.getElementById('meme3').style.display = 'block';
                fetch("https://meme-api.herokuapp.com/gimme/dankmemes/2").then(r=> r.json()).then(d => 
                    document.getElementById('meme3').src = d.memes[0].url ).catch(e=> console.log(e));
            } catch (error) {
                console.log(error)
            }
            
        }
        state.stage = 'mission';
        renderStage();
    }else{
        // Await voting
        if(e.next == userName){
            message.innerText = "Nominate Operatives"
            state.nominator = userName;
            nominateOperatives();
        }else{
            message.innerText = `${e.next} is voting`
            showChild(null, container);
        }
    }
})

socket.on('mission_complete', e=>{
    try {
        document.getElementById('meme3').style.display = 'none';
    } catch (error) {
        console.log(error);
    }
    
    let cont = document.getElementById('mission-outcome');
    //<button onclick='confirmOutcome()' class='button is-success'>Continue</button>
    //cont.innerHTML = "<span id='outcome'></span> <br>  Spies : <span id='wincount_s'></span>  <br> Resistance : <span id='wincount_r'></span> <br> "
    let outcome = document.getElementById('outcome');
    if(e.success){
        outcome.innerText = "Passed!";
        outcome.classList.remove("has-text-danger")
        outcome.classList.add("has-text-success");
    }else{
        outcome.innerText = "Failed!";
        outcome.classList.remove("has-text-success")
        outcome.classList.add("has-text-danger")
    }
    document.getElementById('wincount_r').innerText = e.wins;
    document.getElementById('wincount_s').innerText = Math.abs(e.wins - (e.round-1));
    state.stage = "mission_outcome";
    state.round = e.round;
    message.innerText = "";
    renderStage();
})

function confirmOutcome(){
    socket.emit('confirmRole', null);
    showChild(null, container);
    message.innerText = "Waiting Confirmation";
}

socket.on('game_end', e=>{
    state.stage = 'end_game';
    message.innerText = `In ${e.rounds - 1} rounds,\n`
    if(e.won){
        message.innerText += " Resistance won!"
    }else{
        message.innerText += " Spies won!"
    }
    document.getElementById('wincount_re').innerText = e.wins;
    document.getElementById('wincount_se').innerText = Math.abs(e.wins - (e.rounds - 1));
    let cont = document.getElementById('nominate-operatives-nominator');
    removeListenersAndClearChildren(cont, addNomination);
    state.nominations = []
    renderStage();
    joined = false;
    startedGame = false;
})

socket.on('disconnect', e=>{
    hideMemes();
    if(!joined || state.stage == 'end_game' || state.stage=='pregame')
        return
    showErr(`Game stopped, ${e} has left`)
    state.stage = 'pregame';
    state.round = 1;
    startedGame = false;
    renderStage();
})

function playAgain(){
    joined = true;
    state.stage = 'pregame';
    socket.emit("play_again", userName);
    renderStage();
}

function renderStage(){
    if(!joined){
        showChild('join-room', container);
        return;
    }

    switch(state.stage){
        case 'assign_roles':
            showChild('assign-roles', container);
        break;
        case 'pregame':
            showChild('pregame', container);
        break;
        case 'nominate':
            showChild('nominate-operatives', container);
        break;
        case 'voting':
            showChild('vote', container);
        break;
        case 'mission':
            showChild('mission', container);
        break;
        case 'mission_outcome':
            showChild('mission-outcome', container);
        break;
        case 'end_game':
            showChild('end-game', container);
        break;
        default:
            showChild('join-room', container);
            break;
    }
}

function showChild(id, container){
    for(let i = 0; i < container.children.length; i++){
        container.children[i].style.display = 'none';
    }
    if(id == null){
        return;
    }
    document.getElementById(id).style.display = 'block';
}

renderStage();

function removeListenersAndClearChildren(e, listener){
    var child = e.lastElementChild;
    while (child) { 
        if(child.tagName == "BUTTON" || child.tagName == "BR" || child.id == 'meme3' || child.id == 'meme2')
            break;
        if(listener != null)
            child.removeEventListener('click', listener);  
        e.removeChild(child); 
        child = e.lastElementChild; 
    } 
}

function showErr(message){
    let error = document.getElementById('error');
    error.innerText = message;
    setTimeout(()=>{
        error.style.display = 'none'; 
    },6000)
}

function hideMemes(){
    try{
        document.getElementById('meme').style.display = 'none'
    }catch(err){
        console.log(err)
    }
    try{
        document.getElementById('meme2').style.display = 'none'
    }catch(err){
        console.log(err)
    }
    try{
        document.getElementById('meme3').style.display = 'none'
    }catch(err){
        console.log(err)
    }
}