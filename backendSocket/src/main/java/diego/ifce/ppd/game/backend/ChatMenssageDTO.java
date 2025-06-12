package diego.ifce.ppd.game.backend;

public class ChatMenssageDTO {
    private String mensagem;
    private String tipoJogador;

    public String getMensagem() {
        return mensagem;
    }
    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }
    public String getTipoJogador() {
        return tipoJogador;
    }
    public void setTipoJogador(String tipoJogador) {
        this.tipoJogador = tipoJogador;
    }
}
