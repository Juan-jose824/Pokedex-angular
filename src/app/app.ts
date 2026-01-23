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
  // Diccionario de colores por tipo de Pokémon
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

  // Extrae las llaves de typeColors para generar los botones de filtro
  tiposDisponibles = Object.keys(this.typeColors);
  
  // SIGNALS: Variables reactivas para el estado de la UI
  isSidebarCollapsed = signal(false);   // Controla si el menú lateral está abierto
  isLoading = signal(false);            // Indica si hay una petición en curso
  pokemonList = signal<any[]>([]);      // Almacena los pokémon que se muestran en el grid
  selectedPokemon = signal<any | null>(null); // Almacena el pokémon para la vista de detalle
  tipoActivo = signal<string>('todos'); // Controla qué filtro de tipo está seleccionado
  paginaActual = signal(0);             // Índice de la página actual (0, 1, 2...)
  totalResultados = signal(1025);       // Total de pokémon disponibles (cambia según el tipo)

  // Variables de control interno
  pokemonDeTipoRefs: any[] = [];        // Guarda las URLs de pokémon cuando filtramos por tipo
  pokemonPorPagina = 154;               // Cantidad de pokémon que cargamos por vez
  private lastScrollPosition = 0;       // Guarda el scroll para volver al mismo sitio tras cerrar detalle
  
  // Inyección del servicio de datos
  private pokemonService = inject(PokemonService);

  // Al iniciar el componente, carga la lista inicial
  ngOnInit() {
    this.filtrarPorTipo('todos');
  }

  /**
   * Carga un bloque de Pokémon basado en el offset (posición inicial)
   */
  cargarPagina(offset: number) {
    this.isLoading.set(true);
    this.paginaActual.set(offset / this.pokemonPorPagina);
    
    // Limpiamos la lista para dar feedback visual de que algo está cargando
    this.pokemonList.set([]); 

    if (this.tipoActivo() === 'todos') {
      // Caso A: Carga general (usamos limit y offset de la API)
      this.pokemonService.getPokemonList(this.pokemonPorPagina, offset).subscribe({
        next: (res: any) => {
          // Por cada resultado, creamos una petición para obtener sus detalles (foto, stats)
          const requests = res.results.map((p: any) => this.pokemonService.getPokemonDetail(p.name));
          this.procesarPeticiones(requests);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      // Caso B: Filtro por tipo (cortamos el arreglo de referencias ya descargado)
      const segmento = this.pokemonDeTipoRefs.slice(offset, offset + this.pokemonPorPagina);
      const requests = segmento.map(p => this.pokemonService.getPokemonDetail(p.name));
      this.procesarPeticiones(requests);
    }
  }

  /**
   * Ejecuta múltiples peticiones HTTP en paralelo y guarda los resultados
   */
  private procesarPeticiones(requests: any[]) {
    if (requests.length === 0) {
      this.isLoading.set(false);
      return;
    }

    // forkJoin espera a que TODAS las peticiones terminen para actualizar la lista
    forkJoin(requests).subscribe({
      next: (details: any) => {
        this.pokemonList.set(details);
        this.isLoading.set(false);
        this.scrollToTop(); // Sube el scroll al inicio de la lista
      },
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Cambia el filtro de tipo y resetea la paginación
   */
  filtrarPorTipo(tipo: string) {
    this.tipoActivo.set(tipo);
    this.paginaActual.set(0);
    this.selectedPokemon.set(null);
    this.pokemonList.set([]); 

    if (tipo === 'todos') {
      this.totalResultados.set(1025);
      this.cargarPagina(0);
    } else {
      this.isLoading.set(true);
      // Obtenemos la lista de nombres/urls de pokémon que pertenecen a ese tipo
      this.pokemonService.getPokemonByType(tipo).subscribe({
        next: (res: any) => {
          this.pokemonDeTipoRefs = res.pokemon.map((p: any) => p.pokemon);
          this.totalResultados.set(this.pokemonDeTipoRefs.length);
          this.cargarPagina(0); // Carga los primeros 154 de ese tipo
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  // Calcula cuántas páginas hay en total
  totalPaginas(): number {
    return Math.ceil(this.totalResultados() / this.pokemonPorPagina) || 1;
  }

  // Lógica para el botón de Siguiente
  siguientePagina() {
    const nextOffset = (this.paginaActual() + 1) * this.pokemonPorPagina;
    if (nextOffset < this.totalResultados()) this.cargarPagina(nextOffset);
  }

  // Lógica para el botón de Anterior
  anteriorPagina() {
    const prevOffset = (this.paginaActual() - 1) * this.pokemonPorPagina;
    if (prevOffset >= 0) this.cargarPagina(prevOffset);
  }

  /**
   * Busca un pokémon específico por nombre o ID
   */
  buscarPokemon(termino: string) {
    if (!termino) { this.filtrarPorTipo('todos'); return; }
    this.isLoading.set(true);
    this.pokemonList.set([]);
    this.pokemonService.getPokemonDetail(termino.toLowerCase()).subscribe({
      next: (res: any) => {
        this.pokemonList.set([res]); // Muestra solo el resultado encontrado
        this.tipoActivo.set('Búsqueda');
        this.totalResultados.set(1);
        this.isLoading.set(false);
      },
      error: () => { 
        alert('Pokémon no encontrado'); 
        this.isLoading.set(false); 
        this.filtrarPorTipo('todos');
      }
    });
  }

  // Alterna la visibilidad de la barra lateral
  toggleSidebar() { this.isSidebarCollapsed.update(v => !v); }
  
  // Retorna el color hexadecimal basado en el tipo del pokémon
  getPokemonColor(p: any) { 
    const type = p.types?.[0]?.type?.name;
    return this.typeColors[type] || '#F5F5F5'; 
  }
  
  // Función auxiliar para subir el scroll
  private scrollToTop() { 
    const c = document.querySelector('.main-content'); 
    if (c) c.scrollTop = 0; 
  }
  
  // Abre la vista de detalle y guarda la posición actual del scroll
  verDetalle(p: any) {
    const c = document.querySelector('.main-content');
    if (c) this.lastScrollPosition = c.scrollTop;
    this.selectedPokemon.set(p);
    this.scrollToTop();
  }

  // Cierra el detalle y devuelve al usuario a donde estaba navegando
  cerrarDetalle() {
    this.selectedPokemon.set(null);
    setTimeout(() => {
      const c = document.querySelector('.main-content');
      if (c) c.scrollTop = this.lastScrollPosition;
    }, 0);
  }
}