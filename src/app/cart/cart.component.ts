import { Injectable } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 

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
    this.valorTotal = this.cartService.pegarTotal();
  }

  finalizarCompra() {
    alert('Compra Finalizada');
    this.itens = this.cartService.limparCarrinho();
    this.valorTotal = 0;
  }
}

@Injectable({
  providedIn: 'root' // Isso diz ao Angular: "Eu existo e posso ser usado em qualquer lugar"
})
export class CartService {
  itens: any[] = [];

  pegarItens() { return this.itens; }
  pegarTotal() { return 0; /* sua lógica aqui */ }
  limparCarrinho() { this.itens = []; return this.itens; }
}