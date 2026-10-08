// Безопасное подключение Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg && typeof tg.expand === 'function') {
    tg.expand();
}

const suits = ['♠', '♥', '♦', '♣'];
// Порядок значений для Буркозэла: от шестерки до туза
const values = ['6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'];

let deck = [];
let playerHand = [];
let botHand = [];
let trumpCard = null;
let currentTrick = []; // Карты на столе (текущая взятка)
let turnOwner = 'player'; // Кто ходит ('player' или 'bot')
let penaltyPoints = { player: 0, bot: 0 };
let gameActive = false;

// Стоимость карт в очках
function getCardPoints(card) {
    switch (card.value) {
        case 'Т': return 11;
        case '10': return 10;
        case 'К': return 4;
        case 'Д': return 3;
        case 'В': return 2;
        default: return 0; // 6, 7, 8, 9
    }
}

// Старшинство карт для сравнения
function getCardRank(card) {
    return values.indexOf(card.value);
}

// Создание и перемешивание колоды
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let val of values) {
            deck.push({ suit, value: val });
        }
    }
    deck.sort(() => Math.random() - 0.5);
}

// Проверка особых комбинаций на руках
function checkCombinations(hand, trumpSuit) {
    // 1. «Бура» — 4 козыря
    const trumpCount = hand.filter(c => c.suit === trumpSuit).length;
    if (trumpCount === 4) return { type: 'бура', text: '🔥 Бура! (4 козыря) — мгновенная победа!' };

    // 2. «Москва» — 3 туза (включая козырной)
    const aces = hand.filter(c => c.value === 'Т');
    if (aces.length === 3) return { type: 'москва', text: '⭐ Москва! (3 туза) — право внеочередного хода!' };

    // 3. «4 конца» — 4 десятки или 4 туза
    const tens = hand.filter(c => c.value === '10');
    if (tens.length === 4 || aces.length === 4) return { type: '4_конца', text: '👑 4 конца! — право внеочередного хода!' };

    // 4. «Молодка» — 4 карты одной некозырной масти
    for (let suit of suits) {
        if (suit !== trumpSuit) {
            const suitCards = hand.filter(c => c.suit === suit);
            if (suitCards.length === 4) return { type: 'молодка', text: '⚡ Молодка! (4 карты одной масти) — право внеочередного хода!' };
        }
    }

    return null;
}

// Рендер карт на экране
function renderCards(hand, elementId, isInteractive = false) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    
    hand.forEach((card, index) => {
        const div = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        div.className = `card ${isRed ? 'red' : ''}`;
        div.textContent = `${card.value}${card.suit}`;
        
        if (isInteractive) {
            div.style.cursor = 'pointer';
            div.onclick = () => selectCardToPlay(index);
        }
        container.appendChild(div);
    });
}

function startGame() {
    createDeck();
    
    // Раздаем по 4 карты
    playerHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    botHand = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    
    // Определяем козырь (последняя карта из колоды под низ или открытая)
    trumpCard = deck[deck.length - 1];
    
    // Рендерим козырь на столе
    const trumpContainer = document.getElementById('trump-container');
    if (trumpContainer) {
        const isRed = trumpCard.suit === '♥' || trumpCard.suit === '♦';
        trumpContainer.innerHTML = `<div class="card ${isRed ? 'red' : ''}" style="margin:0;">${trumpCard.value}${trumpCard.suit}</div>`;
    }

    gameActive = true;
    currentTrick = [];
    turnOwner = 'player'; // Игрок начинает первый ход

    document.getElementById('btn-start').textContent = 'Перезапустить';
    document.getElementById('btn-pass').disabled = false;
    document.getElementById('status-message').textContent = 'Ваш ход! Выберите карты для атаки.';

    // Проверяем комбинации на старте
    const playerCombo = checkCombinations(playerHand, trumpCard.suit);
    if (playerCombo) {
        if (playerCombo.type === 'бура') {
            endGame(`🎉 Вы собрали Буру! Победа в партии!`);
            return;
        } else {
            document.getElementById('status-message').textContent = playerCombo.text;
        }
    }

    updateUI();
}

function updateUI() {
    renderCards(playerHand, 'player-cards', turnOwner === 'player');
    // Карты бота показываем рубашкой вверх (просто количество)
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

    renderCards(currentTrick, 'trick-cards');
    document.getElementById('bot-cards-count').textContent = `${botHand.length} карт`;
    document.getElementById('game-score').textContent = `Штраф — Вы: ${penaltyPoints.player} | Бот: ${penaltyPoints.bot} (До 12)`;
}

// Выбор карты игроком для хода
let selectedCardsIndices = [];
function selectCardToPlay(index) {
    if (!gameActive || turnOwner !== 'player') return;
    
    const card = playerHand[index];
    // Логика выбора: можно выбрать карты только одного достоинства для совместного захода
    if (selectedCardsIndices.length > 0) {
        const firstCard = playerHand[selectedCardsIndices[0]];
        if (card.value !== firstCard.value) {
            alert('Можно ходить только картами одного достоинства!');
            return;
        }
    }

    // Переключаем выбор
    const pos = selectedCardsIndices.indexOf(index);
    if (pos > -1) {
        selectedCardsIndices.splice(pos, 1);
    } else {
        selectedCardsIndices.push(index);
    }

    // Подсветка выбранных карт визуально
    const container = document.getElementById('player-cards');
    Array.from(container.children.forEach, () => {}); // Можно добавить класс .selected в CSS по желанию
}

// Функция паса / передачи хода / отбития
function passTurn() {
    if (!gameActive) return;
    
    if (turnOwner === 'player' && selectedCardsIndices.length > 0) {
        // Ход игрока совершен
        currentTrick = selectedCardsIndices.map(i => playerHand[i]);
        // Удаляем карты из руки игрока
        playerHand = playerHand.filter((_, i) => !selectedCardsIndices.includes(i));
        selectedCardsIndices = [];

        // Ход переходит к боту — он должен отбиться
        turnOwner = 'bot';
        document.getElementById('status-message').textContent = 'Бот думает над ответом...';
        updateUI();

        setTimeout(botDefense, 1000);
    }
}

// Ответ бота на атаку игрока
function botDefense() {
    if (!gameActive) return;

    // Бот пытается отбить карты
    let canDefend = true;
    let defenseCards = [];

    for (let attackCard of currentTrick) {
        // Ищем подходящую карту у бота (той же масти выше рангом или козырь)
        let defendingCard = botHand.find(c => c.suit === attackCard.suit && getCardRank(c) > getCardRank(attackCard));
        if (!defendingCard) {
            // Ищем козырь
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
        // Бот успешно отбился! Взятка идет боту
        document.getElementById('status-message').textContent = 'Бот успешно отбился и забрал взятку!';
        turnOwner = 'bot';
    } else {
        // Бот не смог отбиться, сбрасывает карты и взятка достается игроку
        document.getElementById('status-message').textContent = 'Бот не смог отбиться! Взятка ваша.';
        turnOwner = 'player';
    }

    currentTrick = [];
    refillHands();
    updateUI();

    if (turnOwner === 'bot') {
        setTimeout(botAttack, 1200);
    }
}

// Атака бота
function botAttack() {
    if (!gameActive || botHand.length === 0) return;

    // Бот ходит случайной картой
    const attackCard = botHand.splice(0, 1)[0];
    currentTrick = [attackCard];
    turnOwner = 'player';
    
    document.getElementById('status-message').textContent = 'Бот сделал ход! Попробуйте отбиться.';
    updateUI();
}

// Добор карт до 4 штук после взятки
function refillHands() {
    while (playerHand.length < 4 && deck.length > 0) {
        playerHand.push(deck.pop());
    }
    while (botHand.length < 4 && deck.length > 0) {
        botHand.push(deck.pop());
    }

    // Если карты в колоде закончились и у кого-то кончились карты на руках — конец партии
    if (deck.length === 0 && (playerHand.length === 0 || botHand.length === 0)) {
        endGame('Раунд окончен! Подсчет штрафных очков...');
    }
}

function endGame(message) {
    gameActive = false;
    document.getElementById('status-message').textContent = message;
    document.getElementById('btn-pass').disabled = true;
}
