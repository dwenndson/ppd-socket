package diego.ifce.ppd.game.backend;

public class GameState {
    private String[][] tabuleiro;
    private String jogadorAtual;
    private String fase;
    private String mensagemFim;

    public GameState(String[][] tabuleiro, String jogadorAtual, String fase, String mensagemFim) {
        this.tabuleiro = tabuleiro;
        this.jogadorAtual = jogadorAtual;
        this.fase = fase;
        this.mensagemFim = mensagemFim;
    }
    public String[][] getTabuleiro() { return tabuleiro; }
    public String getJogadorAtual() { return jogadorAtual; }
    public String getFase() { return fase; }
    public String getMensagemFim() { return mensagemFim; }
}
