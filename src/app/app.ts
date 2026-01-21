import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonService } from './pokemon.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  // 1. CONFIGURACIÓN Y VARIABLES DE ESTADO
  // Diccionario de colores hexadecimales según el tipo de Pokémon
  typeColors: any = {
    fire: '#E62224',
    grass: '#3FA129',
    electric: '#FAC000',
    water: '#2980EF',
    ground: '#915121',
    rock: '#B0AA82',
    fairy: '#EF70EF',
    poison: '#9141CB',
    bug: '#91A119',
    dragon: '#5060E1',
    psychic: '#EF4179',
    flying: '#81B9EF',
    fighting: '#FF8000',
    normal: '#9FA19F',
    ice: '#3DCEF3',
    ghost: '#704170',
    steel: '#60A1B8', 
    dark: '#624D4E'
  };

  // Extrae los nombres de los tipos del objeto anterior para usarlos en el menú lateral
  tiposDisponibles = Object.keys(this.typeColors);
  
  // Signals: Variables reactivas que notifican a la vista cuando cambian
  isSidebarCollapsed = signal(false); // Controla si el menú lateral está abierto o cerrado
  isLoading = signal(false);          // Controla si se muestra el estado de carga
  pokemonList = signal<any[]>([]);    // Lista de Pokémon que se está mostrando actualmente
  selectedPokemon = signal<any | null>(null); // Guarda el Pokémon que se clickeó para ver su detalle
  tipoActivo = signal<string>('todos');       // Guarda qué filtro de tipo está seleccionado
  paginaActual = signal(0);           // Índice de la página actual para la paginación

  // Variables normales
  fullPokemonList: any[] = [];        // Copia de seguridad de los 154 Pokémon de la página actual
  pokemonPorPagina = 154;             // Cantidad fija de Pokémon por bloque
  totalPokemon = 1025;                // Límite total de la API
  private lastScrollPosition = 0;     // Guarda los píxeles de scroll antes de abrir un detalle
  
  // Inyección del servicio que hace las llamadas a la API
  private pokemonService = inject(PokemonService);

  // Ciclo de vida: Se ejecuta automáticamente cuando la app arranca
  ngOnInit() {
    this.cargarPagina(0); // Empieza cargando la primera página (offset 0)
  }

  // 2. MÉTODOS DE CARGA Y API
  /**
   * Obtiene los Pokémon de la API basándose en un punto de inicio (offset)
   */
  cargarPagina(offset: number) {
    this.isLoading.set(true);
    this.paginaActual.set(offset / this.pokemonPorPagina); // Calcula el número de página
    
    // Primero obtiene la lista de nombres y URLs
    this.pokemonService.getPokemonList(this.pokemonPorPagina, offset).subscribe((res: any) => {
      // Crea un arreglo de peticiones para obtener los detalles (imagen, stats) de cada uno
      const requests = res.results.map((p: any) => this.pokemonService.getPokemonDetail(p.name));
      
      // forkJoin espera a que todas las peticiones individuales terminen
      forkJoin(requests).subscribe((details: any) => {
        this.fullPokemonList = details; // Guarda los datos completos
        this.pokemonList.set(details);  // Los muestra en pantalla
        this.isLoading.set(false);
        
        // Sube el scroll al inicio de la página automáticamente
        const container = document.querySelector('.main-content');
        if (container) container.scrollTop = 0;
      });
    });
  }

  // Calcula el siguiente bloque de 154 y llama a cargarPagina
  siguientePagina() {
    const nextOffset = (this.paginaActual() + 1) * this.pokemonPorPagina;
    if (nextOffset < this.totalPokemon) this.cargarPagina(nextOffset);
  }

  // Calcula el bloque anterior de 154 y llama a cargarPagina
  anteriorPagina() {
    const prevOffset = (this.paginaActual() - 1) * this.pokemonPorPagina;
    if (prevOffset >= 0) this.cargarPagina(prevOffset);
  }

  // 3. MÉTODOS DE FILTRADO Y BÚSQUEDA
  /**
   * Filtra la lista actual (los 154 cargados) según el tipo seleccionado
   */
 // app.ts

filtrarPorTipo(tipo: string) {
  this.tipoActivo.set(tipo);
  this.selectedPokemon.set(null);

  if (tipo === 'todos') {
    // Si elige "todos", volvemos a la carga paginada normal (página 1)
    this.cargarPagina(0);
  } else {
    // Iniciamos estado de carga
    this.isLoading.set(true);

    this.pokemonService.getPokemonByType(tipo).subscribe({
      next: (res: any) => {
        // Extraemos solo la info básica del pokemon de la respuesta
        const pokemonSpecs = res.pokemon.map((p: any) => p.pokemon);

        // Creamos las peticiones de detalle para TODOS los de este tipo
        const requests = pokemonSpecs.map((p: any) => 
          this.pokemonService.getPokemonDetail(p.name)
        );

        // Ejecutamos todas las peticiones en paralelo
        forkJoin(requests).subscribe({
          next: (details: any) => {
            this.pokemonList.set(details); // Mostramos la lista completa del tipo
            this.isLoading.set(false);
            
            // Scroll al inicio
            const container = document.querySelector('.main-content');
            if (container) container.scrollTop = 0;
          },
          error: () => this.isLoading.set(false)
        });
      },
      error: () => {
        this.isLoading.set(false);
        alert('Error al cargar pokémon por tipo');
      }
    });
  }
}
  /**
   * Busca un Pokémon específico por nombre o ID directamente en la API
   */
  buscarPokemon(termino: string) {
    if (!termino) { 
      this.tipoActivo.set('todos');
      this.pokemonList.set(this.fullPokemonList); // Si borra el texto, muestra la lista original
      return; 
    }
    this.isLoading.set(true);
    this.pokemonService.getPokemonDetail(termino.toLowerCase()).subscribe({
      next: (res: any) => {
        this.pokemonList.set([res]); // Convierte el resultado único en arreglo para el @for
        this.tipoActivo.set('');     // Limpia el filtro de tipos
        this.isLoading.set(false);
      },
      error: () => { 
        alert('Pokémon no encontrado'); 
        this.isLoading.set(false); 
      }
    });
  }

  // 4. MÉTODOS DE INTERFAZ (UI)
  // Abre o cierra el sidebar cambiando el valor de la señal
  toggleSidebar() { this.isSidebarCollapsed.update(v => !v); }

  // Devuelve el color correspondiente al tipo principal del Pokémon para el fondo de la tarjeta
  getPokemonColor(pokemon: any): string {
    const type = pokemon.types?.[0]?.type?.name;
    return this.typeColors[type] || '#F5F5F5';
  }

  /**
   * Guarda la posición del scroll y muestra la vista detallada
   */
  verDetalle(pokemon: any) {
    const container = document.querySelector('.main-content');
    if (container) this.lastScrollPosition = container.scrollTop; // Memoriza dónde estaba el usuario
    this.selectedPokemon.set(pokemon);
    if (container) container.scrollTop = 0; // Sube al inicio para ver bien el detalle
  }

  /**
   * Cierra el detalle y devuelve al usuario a la posición exacta donde estaba en la lista
   */
  cerrarDetalle() {
    this.selectedPokemon.set(null);
    setTimeout(() => {
      const container = document.querySelector('.main-content');
      if (container) container.scrollTop = this.lastScrollPosition; // Restaura el scroll
    }, 0);
  }
}