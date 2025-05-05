# ppd-socket

Projeto jogo seega feito com socket

### Como Configurar e Executar
1. Backend (Java)
Pré-requisitos: JDK 17 ou superior, Maven.
Passos:
Certifique-se de que o backend Java (fornecido anteriormente) está no diretório do projeto com o pom.xml configurado.
No terminal, navegue até o diretório do backend e inicie o servidor:

` mvn spring-boot:run `

O backend estará rodando em http://localhost:8080. Verifique se não há erros no console do terminal.

2. Frontend (HTML + JavaScript)
Pré-requisitos: Python 3(sockjs-client e stomp.js).
Passos:
Inicie um servidor local para evitar problemas de CORS:
Com o Python instalado, navegue até a pasta do frontend e execute:
bash

`python -m http.server 8000`

Acesse http://localhost:8000 no navegador.

Abra duas janelas ou abas do navegador em http://localhost:8000 para simular dois jogadores.

3. Testando o Jogo
Conexão WebSocket:
O frontend tenta conectar ao backend em ws://localhost:8080/ws. Certifique-se de que o backend está rodando antes de abrir o frontend.
Se a conexão falhar, você verá um alerta: "Não foi possível conectar ao servidor."
Escolha do Jogador:
Cada jogador deve escolher "1" (BRANCO) ou "2" (PRETO) no prompt inicial.

Jogabilidade:
Fase de Colocação: Clique em casas vazias (exceto o centro) para colocar peças (2 por turno). O backend gerencia a alternância de turnos.

Fase de Movimentação: Clique em uma peça sua para selecioná-la (borda preta aparece) e clique em uma casa adjacente vazia para movê-la.

Capturas: O backend remove peças adversárias encurraladas (exceto no centro).

Centro: Peças no centro são limitadas a 3 turnos, conforme implementado no backend.

Chat: Digite mensagens e pressione Enter ou clique em "Enviar".

Desistir: Clique em "Desistir" para encerrar o jogo, declarando o outro jogador como vencedor.

Fim do Jogo:
O jogo termina quando um jogador fica com 1 peça ou quando há desistência, com uma mensagem exibida.
