import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, CommonModule } from '@angular/common';

import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgClass, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  tabuleiro: string[][] = Array(5).fill('').map(() => Array(5).fill(''));
  fase: string = 'COLOCAÇÃO';
  jogadorAtual: string = 'BRANCO';
  mensagens: string[] = [];
  mensagem: string = '';
  mensagemFim: string = '';
  private stompClient: any;
  private origem: { linha: number, coluna: number } | null = null;

  ngOnInit() {
    this.conectarWebSocket();
  }

  conectarWebSocket() {
    const socket = new SockJS.default('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);
    this.stompClient.connect({}, () => {
      this.stompClient.subscribe('/topic/atualizacaoTabuleiro', (message: any) => {
        this.tabuleiro = JSON.parse(message.body);
      });
      this.stompClient.subscribe('/topic/jogadorAtual', (message: any) => {
        this.jogadorAtual = message.body;
      });
      this.stompClient.subscribe('/topic/fase', (message: any) => {
        this.fase = message.body;
      });
      this.stompClient.subscribe('/topic/mensagens', (message: any) => {
        this.mensagens.push(message.body);
      });
      this.stompClient.subscribe('/topic/fim', (message: any) => {
        this.mensagemFim = message.body;
      });
    });
  }

  clicarCasa(linha: number, coluna: number) {
    if (this.fase === 'COLOCAÇÃO') {
      this.stompClient.send('/app/colocar', {}, JSON.stringify({ linha, coluna }));
    } else {
      if (!this.origem) {
        if (this.tabuleiro[linha][coluna]) {
          this.origem = { linha, coluna };
        }
      } else {
        this.stompClient.send('/app/mover', {}, JSON.stringify({
          linhaOrigem: this.origem.linha,
          colunaOrigem: this.origem.coluna,
          linhaDestino: linha,
          colunaDestino: coluna
        }));
        this.origem = null;
      }
    }
  }

  desistir() {
    this.stompClient.send('/app/desistir', {}, {});
  }

  enviarMensagem() {
    if (this.mensagem) {
      this.stompClient.send('/app/chat', {}, JSON.stringify(this.mensagem));
      this.mensagem = '';
    }
  }
}

