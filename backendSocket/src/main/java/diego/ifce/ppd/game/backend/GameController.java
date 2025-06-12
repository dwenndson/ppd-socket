package diego.ifce.ppd.game.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
class GameController {
    private Tabuleiro tabuleiro = new Tabuleiro();
    private Jogador jogador1 = new Jogador(Cor.BRANCO);
    private Jogador jogador2 = new Jogador(Cor.PRETO);
    private Jogador jogadorAtual = jogador1;
    private boolean faseColocacao = true;
    private int pecasColocadasPorVez = 0;
    private String mensagemFim = null;

    private final List<String> mensagensChat = new ArrayList<>();

    @GetMapping("/state")
    public ResponseEntity<GameState> getGameState(){ return ResponseEntity.ok(createGameState()); }

    @PostMapping("/colocar")
    public ResponseEntity<GameState> colocarPeca(@RequestBody Map<String, Integer> payload) {
        if (!faseColocacao) return ResponseEntity.badRequest().build();

        int linha = payload.get("linha");
        int coluna = payload.get("coluna");
        if (linha == 2 && coluna == 2) return ResponseEntity.badRequest().build(); // Não pode colocar no centro

        Casa casa = tabuleiro.getCasa(linha, coluna);
        if (casa.estaVazia()) {
            casa.setPeca(new Peca(jogadorAtual.getCor()));
            jogadorAtual.decrementarPecasParaColocar();
            pecasColocadasPorVez++;
            if (pecasColocadasPorVez == 2 || (jogador1.getPecasParaColocar() == 0 && jogador2.getPecasParaColocar() == 0)) {
                pecasColocadasPorVez = 0;
                jogadorAtual = (jogadorAtual == jogador1) ? jogador2 : jogador1;
                if (jogador1.getPecasParaColocar() == 0 && jogador2.getPecasParaColocar() == 0) {
                    faseColocacao = false;
                    jogadorAtual = jogador2; // Último a colocar comeca
                }
            }
        }
        return ResponseEntity.ok(createGameState());
    }

    @PostMapping("/mover")
    public ResponseEntity<GameState> moverPeca(@RequestBody Map<String, Integer> payload) {
        if (faseColocacao) return ResponseEntity.badRequest().build();
        int linhaOrigem = payload.get("linhaOrigem");
        int colunaOrigem = payload.get("colunaOrigem");
        int linhaDestino = payload.get("linhaDestino");
        int colunaDestino = payload.get("colunaDestino");
        Casa origem = tabuleiro.getCasa(linhaOrigem, colunaOrigem);
        Casa destino = tabuleiro.getCasa(linhaDestino, colunaDestino);
        if (!origem.estaVazia() && origem.getPeca().getCor() == jogadorAtual.getCor() && destino.estaVazia()) {
            int deltaLinha = Math.abs(linhaDestino - linhaOrigem);
            int deltaColuna = Math.abs(colunaDestino - colunaOrigem);
            if ((deltaLinha == 1 && deltaColuna == 0) || (deltaLinha == 0 && deltaColuna == 1)) {
                Peca peca = origem.getPeca();
                origem.setPeca(null);
                destino.setPeca(peca);
                if (linhaDestino == 2 && colunaDestino == 2) {
                    peca.incrementarTurnosNoCentro();
                } else {
                    peca.resetarTurnosNoCentro();
                }
                verificarCentro();
                verificaCapturas(linhaDestino, colunaDestino);
                jogadorAtual = (jogadorAtual == jogador1) ? jogador2 : jogador1;
            }
        }
        return ResponseEntity.ok(createGameState());
    }

    @PostMapping("/desistir")
    public ResponseEntity<GameState> desistir() {
        String vencedor = jogadorAtual == jogador1 ? "PRETO" : "BRANCO";
        this.mensagemFim = "Jogadore " + vencedor + " venceu por desinstência!";
        return ResponseEntity.ok(createGameState());
    }

    @PostMapping("/chat")
    @SendTo("/topic/mensagens")
    public ResponseEntity<Void> enviarMensagem(@RequestBody ChatMenssageDTO payload) {
        String mensagem = payload.getMensagem();
        String tipoJOgador = payload.getTipoJogador();

        if (mensagem != null && tipoJOgador != null) {
            synchronized (mensagensChat) {
                mensagensChat.add(tipoJOgador + ": " + mensagem);
            }
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/chat")
    public ResponseEntity<List<String>> getMensagens() {
        synchronized(mensagensChat) {
            return ResponseEntity.ok(new ArrayList<>(mensagensChat));
        }
    }

    private GameState createGameState(){
        String faseStr = faseColocacao ? "COLOCAÇÃO" : "MOVIMENTAÇÃO";
        String jogadorAtualStr = jogadorAtual.getCor() == Cor.BRANCO ? "BRANCO" : "PRETO";
        return new GameState(tabuleiro.toArray(), jogadorAtualStr, faseStr, this.mensagemFim);
    }
    private void verificarCentro() {
        Casa centro = tabuleiro.getCasa(2, 2);
        if (!centro.estaVazia() && centro.getPeca().getTurnosNoCentro() >= 3) {
            centro.setPeca(null);
        }
    }
    private void verificaCapturas(int linha, int coluna){
        Cor corAtual = jogadorAtual.getCor();
        Cor corOponente = (corAtual == Cor.BRANCO) ? Cor.PRETO : Cor.BRANCO;

        int[][] direcoes = {{0,1}, {0, -1}, {1, 0}, {-1, 0}};

        for (int[] dir : direcoes) {
            int adjLinha = linha + dir[0];      // Coordenada da peça do oponente
            int adjColuna = coluna + dir[1];

            int alemLinha = linha + 2 * dir[0];   // Coordenada da sua outra peça que forma o sanduíche
            int alemColuna = coluna + 2 * dir[1];

            // Verifica se as coordenadas estão dentro do tabuleiro
            if (isDentroDoTabuleiro(adjLinha, adjColuna) && isDentroDoTabuleiro(alemLinha, alemColuna)) {
                Casa casaAdjacente = tabuleiro.getCasa(adjLinha, adjColuna);
                Casa casaAlem = tabuleiro.getCasa(alemLinha, alemColuna);

                // Condição de captura: a casa adjacente tem uma peça do oponente
                // E a casa "além" tem uma peça sua.
                if (!casaAdjacente.estaVazia() && casaAdjacente.getPeca().getCor() == corOponente &&
                        !casaAlem.estaVazia() && casaAlem.getPeca().getCor() == corAtual)
                {
                    // Captura realizada! Remove a peça do oponente.
                    casaAdjacente.setPeca(null);
                }
            }
        }
    }

    private boolean isDentroDoTabuleiro(int linha, int coluna) {
        return linha >= 0 && linha < 5 && coluna >= 0 && coluna < 5;
    }
}
