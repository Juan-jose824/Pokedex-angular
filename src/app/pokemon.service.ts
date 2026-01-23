import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private http = inject(HttpClient);
  private baseUrl = 'https://pokeapi.co/api/v2';

  getPokemonList(limit: number = 154, offset: number = 0) {
    return this.http.get(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`);
  }

  getPokemonDetail(nameOrId: string | number) {
    return this.http.get(`${this.baseUrl}/pokemon/${nameOrId}`);
  }

  getPokemonByType(type: string) {
    return this.http.get(`${this.baseUrl}/type/${type}`);
  }
}