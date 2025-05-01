package diego.ifce.ppd.game.backend;

import jakarta.annotation.PostConstruct;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
class GameController {
    private Tabuleiro tabuleiro = new Tabuleiro();
    private Jogador jogador1 = new Jogador(Cor.BRANCO);
    private Jogador jogador2 = new Jogador(Cor.PRETO);
    private Jogador jogadorAtual = jogador1;
    private boolean faseColocacão = true;
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
        if (!faseColocacão) return;
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
                    faseColocacão = false;
                    jogadorAtual = jogador2; // Último a colocar comeca
                }
            }
            atualizarTabuleiro();
        }
    }

    @MessageMapping("/mover")
    public void moverPeca(Map<String, Integer> payload) {
        if (faseColocacão) return;
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
                atualizarTabuleiro();
                jogadorAtual = (jogadorAtual == jogador1) ? jogador2 : jogador1;
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
        messagingTemplate.convertAndSend("/topic/fase", faseColocacão ? "COLOCAÇÃO" : "MOVIMENTAÇÃO");
    }
}
