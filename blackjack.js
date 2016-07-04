var LOG = function(content) {
	console.log(content);
};


/************************************************
* 
* Player
*
************************************************/

var Player = function(name, money, callbacks) {
	this._name = name;
	this._money = money;
};


Player.prototype.name = function() {
	return this._name;
};

Player.prototype.dump = function() {
	return "Player " + this.name(); 
};

Player.prototype.bet = function(callbacks) {
	if (this._money > 0) {
		callbacks.bet(1);
	} else {
		callbacks.bet(0);
	}

};

Player.prototype.money = function(delta) {
	this._money += delta;
};


Player.prototype.turn = function(dealerCard, playerHand, allHands, callbacks) {
	if (playerHand.value() > 16) {
		callbacks.stand();
	} else {
		callbacks.hit();		
	}
};



/************************************************
* 
* Card
*
************************************************/

var Card = function(num, suit) {
	this._num = num;
	this._suit = suit;
};

Card.nums = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
Card.values = [[1, 11], 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];

Card.suits = ['♥', '♦', '♣', '♠'];	
Card.suits_html = ['&hearts;', '&diams;', '&clubs;', '&spades;'];

Card.prototype.dump = function() {
	return Card.nums[this._num] + Card.suits[this._suit];
};

Card.prototype.value = function() {
	return Card.values[this._num];
};

Card.prototype.isAce = function() {
	return this._num == 0;
}




/************************************************
* 
* Deck
*
************************************************/

var Deck = function() {
	var self = this;

	this._cards = [];
	this._discards = [];

	for (var i = 0; i < Deck.NUM_DECKS; i++) {
		Card.nums.forEach(function(num, numIndex) {
			Card.suits.forEach(function(suit, suitIndex) {
				self._cards.push(new Card(numIndex, suitIndex));
			});
		});	
	}

	this._shuffle();
};
Deck.NUM_DECKS = 1;
Deck.MINIMUM_CARDS_BEFORE_SHUFFLE = 15;


Deck.prototype._shuffle = function() {
	LOG("Shuffling...");

	// First put the discards back into the deck.
	this._cards.push.apply(this._cards, this._discards);
	this._discards = [];

	// To shuffle an array a of n elements (indices 0..n-1):
	//	for i from 0 to n−2 do
    //		j ← random integer such that i ≤ j < n
    //		exchange a[i] and a[j]
    for (var i = 0; i < this._cards.length - 2; i++) {
    	var j = Math.floor(Math.random() * (this._cards.length - i)) + i;
    	{
    		// Do the swap.
	    	var swap = this._cards[i];
	    	this._cards[i] = this._cards[j];
	    	this._cards[j] = swap;
	    }
    }
};


Deck.prototype.shuffleIfNeeded = function() {
	if (this._cards.length < Deck.MINIMUM_CARDS_BEFORE_SHUFFLE) {
		this._shuffle();
	}
};


Deck.prototype.dealCard = function() {
	var card = this._cards.pop();
	this._discards.push(card);
	return card;
};

Deck.prototype.dump = function() {
	return "Deck: " + this._cards.map(function(card) { return card.dump(); }).join(", ") +
		   "; Discards: " + this._discards.map(function(card) { return card.dump(); }).join(", ");
};




/************************************************
* 
* Hand
*
************************************************/

var Hand = function(deck) {
	this._cards = [deck.dealCard(), deck.dealCard()];
};

Hand.prototype.cards = function() {
	return this._cards;
};

Hand.prototype.containsAce = function() {
	return this._cards.reduce(function(card, last) {
		return last || card.isAce();
	}, false);
};

Hand.prototype.dealerUpCard = function() {
	return this._cards[0];
};

Hand.prototype.hit = function(deck) {
	this._cards.push(deck.dealCard());
};

Hand.prototype.value = function() {
	var values = this._cards.map(function(card) {
		return card.value();
	});

	var numAces = 0;
	var value = values.reduce(function(prev, value) {
		if (Array.isArray(value)) {
			numAces++;
			return prev + value[1];
		} else {
			return prev + value;
		}
	}, 0);

	while (value > 21 && numAces > 0) {
		value -= 10;
		numAces--;
	}

	return value;
};

Hand.prototype.dump = function() {
	return "Cards: " + this._cards.map(function(card) { return card.dump() }).join(", ") +
		   "; Value: " + this.value();
};





/************************************************
* 
* Blackjack
*
************************************************/


var Blackjack = function(players) {
	this._deck = new Deck();
	this._players = players;
	this._dealerHand = null;
	this._hands = [];
	this._bets = [];
	this._results = [];
};

Blackjack.prototype._acceptBet = function() {
	LOG("Accepting bets...");

	var self = this;

	var playerIndex = self._bets.length;
	if (playerIndex >= self._players.length) {
		self._deal();
		return;
	}

	self._players[playerIndex].bet({
		bet: function(amount) {
			if (amount > 0) {
				LOG(player.dump() + " bet " + amount);					
			} else {
				LOG(player.dump() + " is sitting the hand out.");
			}
			self._bets.push(amount);
			self._acceptBet();
		}
	});
};


Blackjack.prototype._deal = function() {
	var self = this;

	if (self._bets.reduce(function(amount, prevTotal) {
			return prevTotal + amount; 
		}, 0) == 0) {
		LOG("No one bet. No hand will be played.");
		return;
	}

	LOG("Dealing...");

	self._hands = self._players.map(function(player, playerIndex) {
		return self._bets[playerIndex] > 0 ? new Hand(self._deck) : null;
	});

	self._dealerHand = new Hand(self._deck);
	LOG("Dealer showing card " + self._dealerHand.dealerUpCard().dump());

	self._results = [];
	self._play();
};


Blackjack.prototype._play = function() {
	var self = this;

	var playerIndex = self._results.length;

	if (playerIndex >= self._players.length) {
		self._dealerPlay();
		return;
	}

	var bet = self._bets[playerIndex];
	if (bet <= 0) {
		self._results.push(0);
		self._play();
		return;
	}

	var player = self._players[playerIndex];
	var hand = self._hands[playerIndex];

	LOG(player.dump() + " hand " + hand.dump());	

	player.turn(self._dealerHand.cards[0], self._hands[playerIndex], self._hands, {
		hit: function() {
			hand.hit(self._deck);
			LOG(player.name() + " hit. New hand: " + hand.dump());
			if (hand.value() > 21) {
				LOG(player.name() + " busted!");
				self._results.push(-bet);
			}
			self._play();		
		},
		stand: function() {
			LOG(self._players[playerIndex].name() + " stood with " + self._hands[playerIndex].value());
			self._results.push(0);
			self._play();
		},
		double: function() {},
		split: function() {}
	});

};




Blackjack.prototype.playHand = function() {
	this._bets = [];
	this._acceptBet();
};




Blackjack.prototype._dealerPlay = function() {
	LOG("Dealer hand: " + this._dealerHand.dump());

	while (this._dealerHand.value() < 17 ||
		   (this._dealerHand.containsAce() && this._dealerHand.value() == 17)) {

		this._dealerHand.hit(this._deck);
		LOG("Dealer hit: " + this._dealerHand.dump());
	}

	LOG("Dealer stands: " + this._dealerHand.dump());
};


Blackjack.prototype.dump = function() {
	var output = "Cards: ";
	this._cards.forEach(function(card) {
		output += card.dump();		
	});
	output += "Discards: ";
	this._discards.forEach(function(card) {
		output += card.dump();
	});

	return output;
};


var player = new Player("John", 1);
var bj = new Blackjack([player]);
bj.playHand();





