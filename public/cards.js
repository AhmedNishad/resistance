
var deck = new Array();

//https://deckofcardsapi.com/static/img/KH.png king of hearts
var baseUrl = "https://deckofcardsapi.com/static/img/"

function randomizeCard(player){
	let cardUrls = getSrcImageArrayCards(player);
    let max = cardUrls.length;
    let src = cardUrls[Math.floor(Math.random() * Math.floor(max))];
	document.querySelector('#assigned-img').src = src;
	return src;
}

function getSrcImageArrayCards(player){
	var cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K"];
	var suits = [];
	if(player == 's'){
		suits = ["diamonds", "hearts"];
	}else{
		suits = ["spades", "clubs"]
	}
    let cardImgs = []
    for(let c = 0; c < cards.length; c++){
        for(let s = 0; s < suits.length; s++){
            let cardId =  cards[c] + suits[s][0].toUpperCase(); 
            let url = baseUrl + cardId + ".png";
            cardImgs.push(url);
        }
    }
    return cardImgs;
}


/*

function getDeck()
{
	var deck = new Array();

	for(var i = 0; i < suits.length; i++)
	{
		for(var x = 0; x < cards.length; x++)
		{
			var card = {Value: cards[x], Suit: suits[i]};
			deck.push(card);
		}
	}

	return deck;
}

function shuffle()
{
	// for 1000 turns
	// switch the values of two random cards
	for (var i = 0; i < 1000; i++)
	{
		var location1 = Math.floor((Math.random() * deck.length));
		var location2 = Math.floor((Math.random() * deck.length));
		var tmp = deck[location1];

		deck[location1] = deck[location2];
		deck[location2] = tmp;
	}

	renderDeck();
}

function renderDeck()
{
	document.getElementById('deck').innerHTML = '';
	for(var i = 0; i < deck.length; i++)
	{
		var card = document.createElement("div");
		var value = document.createElement("div");
		var suit = document.createElement("div");
		card.className = "card";
		value.className = "value";
		suit.className = "suit " + deck[i].Suit;

		value.innerHTML = deck[i].Value;
		card.appendChild(value);
		card.appendChild(suit);

		document.getElementById("deck").appendChild(card);
	}
}

/* function load()
{
	deck = getDeck();
	shuffle();
	renderDeck();
}

window.onload = load; */