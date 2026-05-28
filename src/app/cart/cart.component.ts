import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { CartService } from '../cart.service';

@Component({
  selector: 'app-cart',
  standalone: true, 
  imports: [CommonModule], 
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})

export class CartComponent implements OnInit {
  itens: any[] = [];
  valorTotal: number = 0; // Variável para o total

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.itens = this.cartService.pegarItens();
    this.valorTotal = this.cartService.pegarTotal(); // Calcula ao abrir a tela
  }

  finalizarCompra() {
    alert('Compra Finalizada');
    this.itens = this.cartService.limparCarrinho();
    this.valorTotal = 0; // Zera o total após a compra
  }
}