package diego.ifce.ppd.game.backend;

public class Peca {
    private Cor cor;
    private int turnosNoCentro;

    public Peca(Cor cor) {
        this.cor = cor;
        this.turnosNoCentro = 0;
    }

    public Cor getCor() {
        return cor;
    }

    public int getTurnosNoCentro() {
        return turnosNoCentro;
    }

    public void incrementarTurnosNoCentro() {
        turnosNoCentro++;
    }

    public void resetarTurnosNoCentro() {
        turnosNoCentro = 0;
    }
}
