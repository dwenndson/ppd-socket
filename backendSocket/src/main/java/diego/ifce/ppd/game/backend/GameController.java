package diego.ifce.ppd.game.backend;

import jakarta.annotation.PostConstruct;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
class GameController {
    private Tabuleiro tabuleiro = new Tabuleiro();
    private Jogador jogador1 = new Jogador(Cor.BRANCO);
    private Jogador jogador2 = new Jogador(Cor.PRETO);
    private Jogador jogadorAtual = jogador1;
    private boolean faseColocacao = true;
    private int pecasColocadasPorVez = 0;
    private final SimpMessagingTemplate messagingTemplate;

    public GameController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @PostConstruct
    public void init() {
        atualizarTabuleiro();
    }

    @MessageMapping("/colocar")
    public void colocarPeca(Map<String, Integer> payload) {
        if (!faseColocacao) return;
        int linha = payload.get("linha");
        int coluna = payload.get("coluna");
        if (linha == 2 && coluna == 2) return; // Não pode colocar no centro
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
            atualizarTabuleiro();
        }
    }

    @MessageMapping("/mover")
    public void moverPeca(Map<String, Integer> payload) {
        if (faseColocacao) return;
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
                verificarCapturas(linhaDestino, colunaDestino);

                jogadorAtual = (jogadorAtual == jogador1) ? jogador2 : jogador1;
                atualizarTabuleiro();
            }
        }
    }

    @MessageMapping("/desistir")
    public void desistir() {
        String vencedor = jogadorAtual == jogador1 ? "PRETO" : "BRANCO";
        messagingTemplate.convertAndSend("/topic/fim", "Jogador " + vencedor + " venceu por desistência!");
    }

    @MessageMapping("/chat")
    @SendTo("/topic/mensagens")
    public String enviarMensagem(String mensagem) {
        return (jogadorAtual == jogador1 ? "BRANCO" : "PRETO") + ": " + mensagem;
    }

    private void verificarCentro() {
        Casa centro = tabuleiro.getCasa(2, 2);
        if (!centro.estaVazia() && centro.getPeca().getTurnosNoCentro() >= 3) {
            centro.setPeca(null);
        }
    }

    private void atualizarTabuleiro() {
        messagingTemplate.convertAndSend("/topic/atualizacaoTabuleiro", tabuleiro.toArray());
        messagingTemplate.convertAndSend("/topic/jogadorAtual", jogadorAtual.getCor() == Cor.BRANCO ? "BRANCO" : "PRETO");
        messagingTemplate.convertAndSend("/topic/fase", faseColocacao ? "COLOCAÇÃO" : "MOVIMENTAÇÃO");
    }

    private void verificarCapturas(int linha, int coluna) {
        Cor corJogadorAtual = jogadorAtual.getCor();
        Cor corOponente = (corJogadorAtual == Cor.BRANCO) ? Cor.PRETO : Cor.BRANCO;

        int[][] direcoes = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};

        List<String> capturadas = new ArrayList<>(); //

        for (int[] dir : direcoes) {
            int adjLinha = linha + dir[0];
            int adjColuna = coluna + dir[1];

            int alemLinha = linha + 2 * dir[0];
            int alemColuna = coluna + 2 * dir[1];

            // Verifica se as casas adjacente e "além" estão dentro dos limites do tabuleiro
            if (isDentroDoTabuleiro(adjLinha, adjColuna) && isDentroDoTabuleiro(alemLinha, alemColuna)) {

                Casa casaAdjacente = tabuleiro.getCasa(adjLinha, adjColuna);
                Casa casaAlem = tabuleiro.getCasa(alemLinha, alemColuna);

                // Condições para captura (sanduíche):
                // 1. Casa adjacente contém peça do oponente.
                // 2. Casa "além" contém peça do jogador atual (a que forma o outro lado do sanduíche).
                // 3. A peça a ser capturada NÃO está na casa central (2,2) - Regra comum no Seega.
                if (!casaAdjacente.estaVazia() && casaAdjacente.getPeca().getCor() == corOponente &&
                        !casaAlem.estaVazia() && casaAlem.getPeca().getCor() == corJogadorAtual &&
                        !(adjLinha == 2 && adjColuna == 2) // Peça no centro NÃO é capturada
                )
                {
                    // Captura realizada! Remove a peça do oponente.
                    casaAdjacente.setPeca(null);
                    capturadas.add(adjLinha + "," + adjColuna); // Guarda a posição capturada (opcional)
                }
            }
        }

        if (!capturadas.isEmpty()) {
            System.out.println("Jogador " + corJogadorAtual + " capturou peça(s) em: " + String.join("; ", capturadas));
        }
    }

    private boolean isDentroDoTabuleiro(int linha, int coluna) {
        return linha >= 0 && linha < 5 && coluna >= 0 && coluna < 5;
    }

}
