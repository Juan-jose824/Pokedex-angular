import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private http = inject(HttpClient);
  private baseUrl = 'https://pokeapi.co/api/v2';

  // Obtiene una lista inicial de pokemones
  // pokemon.service.ts

getPokemonList(limit: number = 154, offset: number = 0) {
  // Es vital que la URL use backticks (`) y los símbolos ${}
  return this.http.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
}

  // Obtiene el detalle de uno solo (para el buscador o al hacer click)
  getPokemonDetail(nameOrId: string | number) {
    return this.http.get(`${this.baseUrl}/pokemon/${nameOrId}`);
  }

  // pokemon.service.ts
getPokemonByType(type: string) {
  return this.http.get(`${this.baseUrl}/type/${type}`);
}
}