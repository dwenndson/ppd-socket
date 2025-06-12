let selectedCell = null;
let fase = 'COLOCAÇÃO';
let jogadorAtual = '...';
let localPlayer = null;
let pollingInterval = null;
let chatPollingInterval = null;

const API_BASE_URL = 'http://localhost:8080/api/game';

// Este bloco de código é executado uma única vez, assim que o script é carregado.
// Ele garante que a seleção do jogador aconteça antes de qualquer outra lógica do jogo.
while (localPlayer !== '1' && localPlayer !== '2') {
    localPlayer = prompt('Você é o Jogador 1 (BRANCO) ou Jogador 2 (PRETO)? Digite 1 ou 2');
    // Se o usuário clicar em "Cancelar", o prompt reaparecerá. Isso é esperado.
    if (localPlayer === null) continue;
}
localPlayer = parseInt(localPlayer);
document.title = `Seega Online (RPC) - Jogador ${localPlayer === 1 ? 'BRANCO' : 'PRETO'}`;

// --- Funções Auxiliares de Comunicação ---

/**
 * Função genérica para realizar chamadas à API do jogo.
 * @param {string} endpoint - O endpoint da API (ex: '/state', '/mover').
 * @param {string} method - O método HTTP (ex: 'GET', 'POST').
 * @param {object} body - O corpo da requisição para métodos POST.
 * @returns {Promise<any>} - A resposta da API em formato JSON.
 */
async function callApi(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(API_BASE_URL + endpoint, options);

        if (!response.ok) {
            throw new Error(`API call to ${endpoint} failed with status: ${response.status}`);
        }
        
        // Retorna JSON se a resposta tiver conteúdo, senão null
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        return null;
    } catch (error) {
        console.error('Erro na chamada da API:', error);
        // Opcional: mostrar uma mensagem de erro na UI
        document.getElementById('mensagem-fim').textContent = 'Erro de comunicação com o servidor.';
        stopPolling(); // Para de tentar se houver um erro grave
        stopChatPolling();
        return null;
    }
}


// --- Funções de Atualização da UI ---

/**
 * Função central que atualiza toda a interface do usuário com base no estado recebido do servidor.
 * @param {object} gameState - O objeto de estado do jogo vindo da API.
 */
function updateUI(gameState) {
    if (!gameState) return;

    // Atualiza fase e jogador atual
    fase = gameState.fase;
    jogadorAtual = gameState.jogadorAtual;
    document.getElementById('fase').textContent = `Fase: ${fase}`;
    document.getElementById('jogador-atual').textContent = `Vez do Jogador: ${jogadorAtual}`;

    // Atualiza o tabuleiro
    atualizarTabuleiro(gameState.tabuleiro);
    
    // Verifica se o jogo terminou
    if (gameState.mensagemFim) {
        document.getElementById('mensagem-fim').textContent = gameState.mensagemFim;
        disableBoard();
        stopPolling(); // Para de perguntar ao servidor
        stopChatPolling();
    } else {
        // Lógica de Polling: só pergunta o estado do jogo se não for a minha vez.
        const isMyTurn = (localPlayer === 1 && jogadorAtual === 'BRANCO') || (localPlayer === 2 && jogadorAtual === 'PRETO');
        if (isMyTurn) {
            stopPolling(); // É minha vez, o controle é meu.
        } else {
            startPolling(); // É a vez do oponente, preciso ficar perguntando.
        }
    }
}


// Prompt para escolher o jogador
while (localPlayer !== '1' && localPlayer !== '2') {
    localPlayer = prompt('Você é o Jogador 1 (BRANCO) ou Jogador 2 (PRETO)? Digite 1 ou 2');
}
localPlayer = parseInt(localPlayer);
document.title = `Seega Online - Jogador ${localPlayer === 1 ? 'BRANCO' : 'PRETO'}`;



function atualizarTabuleiro(tabuleiro) {
    let contBranco = 0;
    let contPreto = 0;
    
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            cell.classList.remove('branco', 'preto');
            
            if (tabuleiro[i][j] === 'B') {
                cell.classList.add('branco');
                cell.textContent = 'B';
                contBranco++;
            } else if (tabuleiro[i][j] === 'P') {
                cell.classList.add('preto');
                cell.textContent = 'P';
                contPreto++;
            } else {
                cell.textContent = '';
            }
        }
    }
    
    document.getElementById('score-branco').textContent = contBranco;
    document.getElementById('score-preto').textContent = contPreto;
}

async function handleCellClick(cell, row, col) {
   // if (cell.dataset.blocked === 'true' && fase === 'COLOCAÇÃO') return;

    const isLocalPlayerTurn = (localPlayer === 1 && jogadorAtual === 'BRANCO') || (localPlayer === 2 && jogadorAtual === 'PRETO');
    if (!isLocalPlayerTurn) return;

    if (fase === 'COLOCAÇÃO') {
        if (cell.classList.contains('branco') || cell.classList.contains('preto')) return;
        const gameState = await callApi('/colocar', 'POST', { linha: row, coluna: col });
        updateUI(gameState)
    } else {
        const isOwnPiece = cell.classList.contains(localPlayer === 1 ? 'branco' : 'preto');
        if (isOwnPiece) {
            if (selectedCell) selectedCell.classList.remove('selected');
            selectedCell = cell;
            selectedCell.classList.add('selected');
        } else if (selectedCell && !cell.classList.contains('branco') && !cell.classList.contains('preto')) {
            const fromRow = parseInt(selectedCell.dataset.row);
            const fromCol = parseInt(selectedCell.dataset.col);

            // O alerta de movimento inválido pode ser mantido ou a validação pode ser feita no backend.
            // Aqui, a chamada é feita de qualquer forma e o backend decide.
            const isAdjacent = Math.abs(fromRow - row) + Math.abs(fromCol - col) === 1;
            if (!isAdjacent) {
                alert('Movimento inválido! Só é permitido mover para uma casa adjacente (horizontal ou vertical).');
                return;
            }

            const gameState = await callApi('/mover', 'POST', {
                linhaOrigem: fromRow,
                colunaOrigem: fromCol,
                linhaDestino: row,
                colunaDestino: col
            });
        

            selectedCell.classList.remove('selected');
            selectedCell = null;
            updateUI(gameState);
        }
    }
}


async function enviarMensagem() {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
    const playerType = localPlayer === 1 ? 'BRANCO' : 'PRETO';
        await callApi('/chat', 'POST', {
            mensagem: input.value.trim(),
            tipoJogador: playerType
        });
        input.value = '';
        fetchChatMessages(); // Atualiza o chat imediatamente após enviar.;
    }
}

async function desistir() {
     if (confirm('Tem certeza que deseja desistir?')) {
        const gameState = await callApi('/desistir', 'POST');
        updateUI(gameState);
    }
}

// --- Funções de Polling ---

function startPolling() {
    // Se o polling já estiver ativo, não faz nada.
    if (pollingInterval) return; 
    console.log("Iniciando polling (aguardando oponente)...");
    pollingInterval = setInterval(async () => {
        const gameState = await callApi('/state');
        updateUI(gameState);
    }, 2000); // Pergunta ao servidor a cada 2 segundos.
}

function stopPolling() {
    if (pollingInterval) {
        console.log("Parando polling (sua vez de jogar).");
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function fetchChatMessages() {
    const messages = await callApi('/chat', 'GET');
    if (!messages) return;

    const chatBox = document.getElementById('chat-box');
    // Só redesenha se o conteúdo mudou para evitar piscar
    if (chatBox.children.length !== messages.length) {
        chatBox.innerHTML = ''; // Limpa o chat para redesenhar
        messages.forEach(msg => {
            const playerColor = msg.split(':')[0];
            const isLocalMessage = (localPlayer === 1 && playerColor === 'BRANCO') || (localPlayer === 2 && playerColor === 'PRETO');
            const bubbleClass = isLocalMessage ? 'bubble-right' : 'bubble-left';
            
            const bubble = document.createElement('div');
            bubble.classList.add('chat-bubble', bubbleClass);
            if (msg.endsWith(': null')) {
                 bubble.textContent = `${playerColor}: (mensagem não pôde ser lida)`;
                 bubble.style.opacity = '0.7';
            } else {
                 bubble.textContent = msg;
            }            chatBox.appendChild(bubble);
            });
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function startChatPolling() {
    if (chatPollingInterval) return;
    chatPollingInterval = setInterval(fetchChatMessages, 3000); // Verifica novas mensagens a cada 3s
}

function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

// --- Funções de Inicialização e Utilitários ---

/**
 * Cria o tabuleiro visualmente no HTML.
 */

function inicializarTabuleiroVisual() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `cell-${i}-${j}`;
            cell.dataset.row = i;
            cell.dataset.col = j;
            if (i === 2 && j === 2) {
                cell.classList.add('centro');
                // Não bloqueamos mais o clique aqui, a lógica do backend decide.
            }
            cell.onclick = () => handleCellClick(cell, i, j);
            board.appendChild(cell);
        }
    }
}

function disableBoard() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.onclick = null;
        cell.style.cursor = 'not-allowed';
    });
}

async function inicializarJogo() {

    inicializarTabuleiroVisual();

    const gameState = await callApi('/state');
    updateUI(gameState);
    
    // Inicia o polling para o chat
    fetchChatMessages();
    startChatPolling();
}

document.getElementById('send-msg').addEventListener('click', enviarMensagem);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enviarMensagem();
});
document.getElementById('btn-desistir').addEventListener('click', desistir);

window.onload = inicializarJogo;