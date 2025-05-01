package diego.ifce.ppd.game.backend;

public class Jogador {
    private Cor cor;
    private int pecasParaColocar = 12;

    public Jogador(Cor cor) {
        this.cor = cor;
    }

    public Cor getCor() {
        return cor;
    }

    public int getPecasParaColocar() {
        return pecasParaColocar;
    }

    public void decrementarPecasParaColocar() {
        if (pecasParaColocar > 0) {
            pecasParaColocar--;
        }
    }
}
