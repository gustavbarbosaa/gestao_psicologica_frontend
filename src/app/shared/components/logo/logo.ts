import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  imports: [NgClass],
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  logoReduzida = input.required<boolean>();
  corSubtitulo = input<string>('text-accent');
}
