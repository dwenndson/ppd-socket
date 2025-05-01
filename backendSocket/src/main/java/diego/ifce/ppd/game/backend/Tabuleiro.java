package diego.ifce.ppd.game.backend;

public class Tabuleiro {
    private Casa[][] casas = new Casa[5][5];

    public Tabuleiro() {
        for (int i = 0; i < 5; i++) {
            for (int j = 0; j < 5; j++) {
                casas[i][j] = new Casa();
            }
        }
    }

    public Casa getCasa(int linha, int coluna) {
        return casas[linha][coluna];
    }

    public String[][] toArray() {
        String[][] array = new String[5][5];
        for (int i = 0; i < 5; i++) {
            for (int j = 0; j < 5; j++) {
                Peca peca = casas[i][j].getPeca();
                array[i][j] = peca == null ? "" : peca.getCor() == Cor.BRANCO ? "B" : "P";
            }
        }
        return array;
    }
}
