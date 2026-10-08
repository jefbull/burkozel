const tg = window.Telegram?.WebApp;
if (tg && typeof tg.expand === 'function') {
    tg.expand();
}

const suits = ['♠', '♥', '♦', '♣'];
const values = ['6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];

let deck = [];
let playerHand = [];
let botHand = [];
let trumpCard = null;
let currentTrick = [];
let turnOwner = 'player';
let penaltyPoints = { player: 0, bot: 0 };
let gameActive = false;
let selectedCardsIndices = [];

function getCardPoints(card) {
    switch (card.value) {
        case 'Т': return 11;
        case '10': return 10;
        case 'К': return 4;
        case 'Д': return 3;
        case 'В': return 2;
        default: return 0;
    }
}

function getCardRank(card) {
    return values.indexOf(card.value);
}

function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let val of values) {
            deck.push({ suit, value: val });
        }
    }
    deck.sort(() => Math.random() - 0.5);
}

function checkCombinations(hand, trumpSuit) {
    const trumpCount = hand.filter(c => c.suit === trumpSuit).length;
    if (trumpCount === 4) return { text: '🔥 Бура! (4 козыря) — победа в партии!' };

    const aces = hand.filter(c => c.value === 'Т');
    if (aces.length === 3) return { text: '⭐ Москва! (3 туза) — право хода!' };

    const tens = hand.filter(c => c.value === '10');
    if (tens.length === 4 || aces.length === 4) return { text: '👑 4 конца! — право хода!' };

    for (let suit of suits) {
        if (suit !== trumpSuit) {
            const suitCards = hand.filter(c => c.suit === suit);
            if (suitCards.length === 4) return { text: '⚡ Молодка! (4 карты одной масти) — право хода!' };
        }
    }
    return null;
}

function renderCards() {
    const playerContainer = document.getElementById('player-cards');
    if (playerContainer) {
        playerContainer.innerHTML = '';
        playerHand.forEach((card, index) => {
            const div = document.createElement('div');
            const isRed = card.suit === '♥' || card.suit === '♦';
            div.className = `card ${isRed ? 'red' : ''} ${selectedCardsIndices.includes(index) ? 'selected-card' : ''}`;
            div.textContent = `${card.value}${card.suit}`;
            
            if (turnOwner === 'player') {
                div.style.cursor = 'pointer';
                div.onclick = () => selectCardToPlay(index);
            }
            playerContainer.appendChild(div);
        });
    }

    const botContainer = document.getElementById('bot-cards');
    if (botContainer) {
        botContainer.innerHTML = '';
        botHand.forEach(() => {
            const div = document.createElement('div');
            div.className = 'card card-back';
            div.textContent = '🂠';
            botContainer.appendChild(div);
        });
    }

    const trickContainer = document.getElementById('trick-cards');
    if (trickContainer) {
        trickContainer.innerHTML = '';
        currentTrick.forEach(card => {
            const div = document.createElement('div');
            const isRed = card.suit === '♥' || card.suit === '♦';
            div.className = `card ${isRed ? 'red' : ''}`;
            div.textContent = `${card.value}${card.suit}`;
            trickContainer.appendChild(div);
        });
    }

    document.getElementById('bot-cards-count').textContent = `${botHand.length} карт`;
    document.getElementById('game-score').textContent = `Штраф — Вы: ${penaltyPoints.player} | Бот: ${penaltyPoints.bot} (До 12)`;
}

function startGame() {
    createDeck();
    playerHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    botHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    trumpCard = deck[deck.length - 1];
    
    const trumpContainer = document.getElementById('trump-container');
    if (trumpContainer) {
        const isRed = trumpCard.suit === '♥' || trumpCard.suit === '♦';
        trumpContainer.innerHTML = `<div class="card ${isRed ? 'red' : ''}" style="margin:0;">${trumpCard.value}${trumpCard.suit}</div>`;
    }

    gameActive = true;
    currentTrick = [];
    turnOwner = 'player';
    selectedCardsIndices = [];

    document.getElementById('btn-start').textContent = 'Перезапустить';
    document.getElementById('btn-pass').disabled = false;
    document.getElementById('status-message').textContent = 'Ваш ход! Выберите карты ОДНОЙ масти для атаки.';

    const combo = checkCombinations(playerHand, trumpCard.suit);
    if (combo) {
        document.getElementById('status-message').textContent = combo.text;
    }

    renderCards();
}

function selectCardToPlay(index) {
    if (!gameActive || turnOwner !== 'player') return;

    const card = playerHand[index];

    // Проверяем правило: все выбранные карты для захода должны быть ОДНОЙ масти
    if (selectedCardsIndices.length > 0) {
        const firstCard = playerHand[selectedCardsIndices[0]];
        if (card.suit !== firstCard.suit) {
            // Если выбрали карту другой масти — сбрасываем выбор и начинаем собирать новую масть
            selectedCardsIndices = [index];
            renderCards();
            return;
        }
    }

    const pos = selectedCardsIndices.indexOf(index);
    if (pos > -1) {
        selectedCardsIndices.splice(pos, 1);
    } else {
        if (selectedCardsIndices.length < 4) {
            selectedCardsIndices.push(index);
        }
    }
    renderCards();
}

function passTurn() {
    if (!gameActive || turnOwner !== 'player') return;
    
    if (selectedCardsIndices.length === 0) {
        alert('Выберите карты для хода!');
        return;
    }

    currentTrick = selectedCardsIndices.map(i => playerHand[i]);
    playerHand = playerHand.filter((_, i) => !selectedCardsIndices.includes(i));
    selectedCardsIndices = [];

    turnOwner = 'bot';
    document.getElementById('status-message').textContent = 'Бот думает над ответом...';
    renderCards();

    setTimeout(botDefense, 1200);
}

function botDefense() {
    if (!gameActive) return;

    let canDefend = true;
    let defenseCards = [];

    for (let attackCard of currentTrick) {
        let defendingCard = botHand.find(c => c.suit === attackCard.suit && getCardRank(c) > getCardRank(attackCard));
        if (!defendingCard) {
            defendingCard = botHand.find(c => c.suit === trumpCard.suit);
        }

        if (defendingCard) {
            defenseCards.push(defendingCard);
            botHand = botHand.filter(c => c !== defendingCard);
        } else {
            canDefend = false;
            break;
        }
    }

    if (canDefend && defenseCards.length === currentTrick.length) {
        document.getElementById('status-message').textContent = 'Бот отбился и забрал взятку!';
        turnOwner = 'bot';
    } else {
        document.getElementById('status-message').textContent = 'Бот не смог отбиться! Взятка ваша.';
        turnOwner = 'player';
    }

    currentTrick = [];
    refillHands();
    renderCards();

    if (turnOwner === 'bot' && gameActive) {
        setTimeout(botAttack, 1500);
    }
}

function botAttack() {
    if (!gameActive || botHand.length === 0) return;

    const attackCard = botHand.splice(0, 1)[0];
    currentTrick = [attackCard];
    turnOwner = 'player';
    
    document.getElementById('status-message').textContent = 'Бот сделал ход! Выберите карты одной масти для ответа.';
    renderCards();
}

function refillHands() {
    while (playerHand.length < 4 && deck.length > 0) {
        playerHand.push(deck.pop());
    }
    while (botHand.length < 4 && deck.length > 0) {
        botHand.push(deck.pop());
    }

    if (deck.length === 0 && (playerHand.length === 0 || botHand.length === 0)) {
        gameActive = false;
        document.getElementById('status-message').textContent = 'Раунд завершен! Начните новую игру.';
        document.getElementById('btn-pass').disabled = true;
    }
}
