let tg = window.Telegram.WebApp;
tg.expand();

// Инициализация имени пользователя из Telegram
let userNameElem = document.getElementById("user-name");
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    let user = tg.initDataUnsafe.user;
    userNameElem.innerText = user.first_name || "Игрок";
}

// Колода и состояние игры
const suits = [
    { symbol: '♠', name: 'spades', color: 'black' },
    { symbol: '♣', name: 'clubs', color: 'black' },
    { symbol: '♥', name: 'hearts', color: 'red' },
    { symbol: '♦', name: 'diams', color: 'red' }
];

const ranks = [
    { name: '6', points: 0, power: 1 },
    { name: '7', points: 0, power: 2 },
    { name: '8', points: 0, power: 3 },
    { name: '9', points: 0, power: 4 },
    { name: 'J', points: 2, power: 5 },
    { name: 'Q', points: 3, power: 6 },
    { name: 'K', points: 4, power: 7 },
    { name: '10', points: 10, power: 8 },
    { name: 'A', points: 11, power: 9 }
];

let deck = [];
let playerCards = [];
let botCards = [];
let trickCards = [];
let trumpCard = null;
let playerScoreTotal = 0;
let botScoreTotal = 0;
let turn = 'player'; // 'player' или 'bot'

function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({
                suit: suit.symbol,
                color: suit.color,
                name: rank.name,
                points: rank.points,
                power: rank.power
            });
        }
    }
    // Перемешивание колоды
    for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function startGame() {
    createDeck();
    playerCards = [];
    botCards = [];
    trickCards = [];
    
    // Раздаем по 4 карты
    for (let i = 0; i < 4; i++) {
        playerCards.push(deck.pop());
        botCards.push(deck.pop());
    }

    // Определяем козырь из оставшихся в колоде
    trumpCard = deck.pop();
    
    document.getElementById("status-message").innerText = "Ваш ход! Выберите карту.";
    document.getElementById("btn-start").innerText = "Заново";
    document.getElementById("btn-pass").disabled = false;

    renderTable();
}

function renderCardHTML(card, isHidden = false) {
    if (isHidden) {
        return `<div class="card card-back"></div>`;
    }
    let colorClass = card.color === 'red' ? 'red' : '';
    return `
        <div class="card ${colorClass}">
            <div class="card-corner top-left">
                <span class="card-value">${card.name}</span>
                <span class="card-suit-small">${card.suit}</span>
            </div>
            <div class="card-center-suit">${card.suit}</div>
            <div class="card-corner bottom-right">
                <span class="card-value">${card.name}</span>
                <span class="card-suit-small">${card.suit}</span>
            </div>
        </div>
    `;
}

function renderTable() {
    // Рендер козыря
    let trumpElem = document.getElementById("trump-container");
    trumpElem.innerHTML = trumpCard ? renderCardHTML(trumpCard) : '';

    // Рендер карт бота (рубашкой вверх)
    let botContainer = document.getElementById("bot-cards");
    botContainer.innerHTML = botCards.map(() => `<div class="card card-back"></div>`).join('');
    document.getElementById("bot-cards-count").innerText = `${botCards.length} карт`;

    // Рендер карт на столе
    let trickContainer = document.getElementById("trick-cards");
    trickContainer.innerHTML = trickCards.map(c => renderCardHTML(c)).join('');

    // Рендер карт игрока (кликабельные)
    let playerContainer = document.getElementById("player-cards");
    playerContainer.innerHTML = playerCards.map((card, index) => {
        let colorClass = card.color === 'red' ? 'red' : '';
        return `
            <div class="card ${colorClass}" onclick="playCard(${index})">
                <div class="card-corner top-left">
                    <span class="card-value">${card.name}</span>
                    <span class="card-suit-small">${card.suit}</span>
                </div>
                <div class="card-center-suit">${card.suit}</div>
                <div class="card-corner bottom-right">
                    <span class="card-value">${card.name}</span>
                    <span class="card-suit-small">${card.suit}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById("game-score").innerText = `Очки: ${playerScoreTotal} / 31`;
}

function playCard(index) {
    if (turn !== 'player') return;

    let card = playerCards.splice(index, 1)[0];
    trickCards.push(card);
    renderTable();

    turn = 'bot';
    document.getElementById("status-message").innerText = "Ход противника...";

    setTimeout(botTurn, 1000);
}

function botTurn() {
    if (botCards.length === 0) return;

    // Бот ходит случайной картой из своих
    let botCardIndex = Math.floor(Math.random() * botCards.length);
    let card = botCards.splice(botCardIndex, 1)[0];
    trickCards.push(card);

    renderTable();

    // Завершение взятки через секунду
    setTimeout(() => {
        resolveTrick();
    }, 1200);
}

function resolveTrick() {
    // Подсчет очков взятки
    let trickPoints = trickCards.reduce((sum, c) => sum + c.points, 0);
    
    // Для упрощения: кто положил последнюю карту / старшую — забирает взятку (здесь упрощенно отдает игроку или боту)
    playerScoreTotal += trickPoints;
    trickCards = [];
    
    // Добор карт из колоды, если они есть
    while (playerCards.length < 4 && deck.length > 0) {
        playerCards.push(deck.pop());
    }
    while (botCards.length < 4 && deck.length > 0) {
        botCards.push(deck.pop());
    }

    turn = 'player';
    
    if (playerScoreTotal >= 31) {
        document.getElementById("status-message").innerText = "🎉 Вы выиграли партию в Буркозла!";
        document.getElementById("btn-pass").disabled = true;
    } else {
        document.getElementById("status-message").innerText = `Взятка ваша! Получено +${trickPoints} очков. Ваш ход.`;
    }

    renderTable();
}

function passToken() {
    passTurn();
}

function passTurn() {
    trickCards = [];
    document.getElementById("status-message").innerText = "Пас. Ход переходит к противнику.";
    renderTable();
}