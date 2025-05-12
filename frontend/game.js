let stompClient = null;
let selectedCell = null;
let fase = 'COLOCAÇÃO';
let jogadorAtual = 'BRANCO';
let localPlayer = null;

// Prompt para escolher o jogador
while (localPlayer !== '1' && localPlayer !== '2') {
    localPlayer = prompt('Você é o Jogador 1 (BRANCO) ou Jogador 2 (PRETO)? Digite 1 ou 2');
}
localPlayer = parseInt(localPlayer);
document.title = `Seega Online - Jogador ${localPlayer === 1 ? 'BRANCO' : 'PRETO'}`;

function conectarWebSocket() {
    const socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, () => {
        console.log('Conexão WebSocket estabelecida!');
        stompClient.subscribe('/topic/atualizacaoTabuleiro', (message) => {
            const tabuleiro = JSON.parse(message.body);
            atualizarTabuleiro(tabuleiro);
        });
        stompClient.subscribe('/topic/jogadorAtual', (message) => {
            jogadorAtual = message.body;
            document.getElementById('jogador-atual').textContent = `Vez do Jogador: ${jogadorAtual}`;
        });
        stompClient.subscribe('/topic/fase', (message) => {
            fase = message.body;
            document.getElementById('fase').textContent = `Fase: ${fase}`;
        });
        stompClient.subscribe('/topic/mensagens', (message) => {
            appendChatMessage(message.body);
        });
        stompClient.subscribe('/topic/fim', (message) => {
            document.getElementById('mensagem-fim').textContent = message.body;
            disableBoard();
        });
        inicializarTabuleiro();
    }, (error) => {
        console.error('Erro na conexão WebSocket:', error);
        alert('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    });
}

function inicializarTabuleiro() {
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
                cell.dataset.blocked = 'true';
            }
            cell.onclick = () => handleCellClick(cell, i, j);
            board.appendChild(cell);
        }
    }
}

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

function handleCellClick(cell, row, col) {
    if (cell.dataset.blocked === 'true' && fase === 'COLOCAÇÃO') return;

    const isLocalPlayerTurn = (localPlayer === 1 && jogadorAtual === 'BRANCO') || (localPlayer === 2 && jogadorAtual === 'PRETO');
    if (!isLocalPlayerTurn) return;

    if (fase === 'COLOCAÇÃO') {
        if (cell.classList.contains('branco') || cell.classList.contains('preto')) return;
        stompClient.send('/app/colocar', {}, JSON.stringify({ linha: row, coluna: col }));
    } else {
        const isOwnPiece = cell.classList.contains(localPlayer === 1 ? 'branco' : 'preto');
        if (isOwnPiece) {
            if (selectedCell) selectedCell.classList.remove('selected');
            selectedCell = cell;
            selectedCell.classList.add('selected');
        } else if (selectedCell && !cell.classList.contains('branco') && !cell.classList.contains('preto')) {
            const fromRow = parseInt(selectedCell.dataset.row);
            const fromCol = parseInt(selectedCell.dataset.col);
            const isAdjacent = Math.abs(fromRow - row) + Math.abs(fromCol - col) === 1;
            if (!isAdjacent) {
                alert('Movimento inválido! Só é permitido mover para uma casa adjacente (horizontal ou vertical).');
                return;
            }
            stompClient.send('/app/mover', {}, JSON.stringify({
                linhaOrigem: fromRow,
                colunaOrigem: fromCol,
                linhaDestino: row,
                colunaDestino: col
            }));
            selectedCell.classList.remove('selected');
            selectedCell = null;
        }
    }
}

function appendChatMessage(msg) { // Use 'msg' como definido no parâmetro
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Verifica se a mensagem começa com um prefixo de jogador
    const messageRegex = /^([A-Z]+): (.*)/;
    const matches = msg.match(messageRegex); 

    if (matches && matches.length === 3) {
        const prefixJogador = matches[1];
        const conteudoMensagem = matches[2];

        try {
            const jsonData = JSON.parse(conteudoMensagem);
            if (jsonData.mensagem && jsonData.tipoJogador) {
                const senderType = jsonData.tipoJogador;
                const messageText = jsonData.mensagem;
                const playerType = localPlayer === 1 ? 'BRANCO' : 'PRETO';
                const isLocalMessage = senderType === playerType;
                const bubbleClass = isLocalMessage ? 'bubble-right' : 'bubble-left';

                const bubble = document.createElement('div');
                bubble.classList.add('chat-bubble', bubbleClass);
                bubble.innerHTML = `Jogador ${senderType}: ${messageText} <span class="chat-time">${time}</span>`;
                document.getElementById('chat-box').appendChild(bubble);
                document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
                return; // Sai da função se formatado com sucesso
            }
        } catch (e) {
            console.log("Conteúdo após prefixo não é JSON válido ou falta campos:", e);
            // Continua para tentar outras formas de parse ou fallback
        }
    }

    // Tenta parsear a mensagem completa como JSON (caso não tenha o prefixo)
    try {
        const data = JSON.parse(msg); // << CORREÇÃO AQUI
        if (data.mensagem && data.tipoJogador) {
            const senderType = data.tipoJogador;
            const messageText = data.mensagem;
            const playerType = localPlayer === 1 ? 'BRANCO' : 'PRETO';
            const isLocalMessage = senderType === playerType;
            const bubbleClass = isLocalMessage ? 'bubble-right' : 'bubble-left';

            const bubble = document.createElement('div');
            bubble.classList.add('chat-bubble', bubbleClass);
            bubble.innerHTML = `Jogador ${senderType}: ${messageText} <span class="chat-time">${time}</span>`;
            document.getElementById('chat-box').appendChild(bubble);
            document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
            return; // Sai da função se formatado com sucesso
        }
    } catch (e) {
        console.log("Não foi possível parsear a mensagem completa como JSON:", e);
        // Continua para o fallback
    }

    // Fallback para exibir a mensagem como texto simples se nenhum parse funcionou
    // Pode ser útil para mensagens do sistema ou formatos inesperados
    console.warn("Exibindo mensagem como texto simples (fallback):", msg);
    const playerType = localPlayer === 1 ? 'BRANCO' : 'PRETO';
    // Verifica se a mensagem bruta contém o nome do jogador local para alinhar à direita (opcional)
    const messageContainsPlayer = typeof msg === 'string' && msg.includes(`Jogador ${playerType}:`); // << Usa msg aqui também
    const bubbleClass = messageContainsPlayer ? 'bubble-right' : 'bubble-left';

    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', bubbleClass);
    bubble.innerHTML = `${msg} <span class="chat-time">${time}</span>`; // Exibe a msg original
    document.getElementById('chat-box').appendChild(bubble);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
}

function enviarMensagem() {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) {
        // Adiciona informação do jogador local na mensagem
        const playerType = localPlayer === 1 ? 'BRANCO' : 'PRETO';
        stompClient.send('/app/chat', {}, 
            JSON.stringify({
                mensagem: input.value.trim(),
                tipoJogador: playerType
            })
        );
        input.value = '';
    }
}

function desistir() {
    if (confirm('Tem certeza que deseja desistir?')) {
        stompClient.send('/app/desistir', {}, {});
    }
}

function disableBoard() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.onclick = null;
        cell.style.cursor = 'not-allowed';
    });
}

document.getElementById('send-msg').addEventListener('click', enviarMensagem);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enviarMensagem();
});
document.getElementById('btn-desistir').addEventListener('click', desistir);

window.onload = conectarWebSocket;