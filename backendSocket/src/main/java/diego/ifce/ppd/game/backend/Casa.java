package diego.ifce.ppd.game.backend;

public class Casa {
    private Peca peca;
    public Casa() {
        this.peca = null;
    }

    public Peca getPeca() {
        return peca;
    }

    public void setPeca(Peca peca) {
        this.peca = peca;
    }

    public boolean estaVazia() {
        return peca == null;
    }
}
