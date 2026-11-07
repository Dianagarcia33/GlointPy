/**
 * Preguntas de la rifa por eliminación de GLOINT Power Tech 2026, armadas con el contenido de la presentación
 * («5. GLOINT_PowerTech_2026_Portada_Equipo»). Van de las más fáciles a las que exigen recordar cifras.
 */
export interface DeckQuestion {
  question: string;
  options: string[];
  correct: number;
  seconds: number;
}

export const DECK_QUESTIONS: DeckQuestion[] = [
  { question: '¿Qué significa la letra Q de la palabra EQUIPO?', options: ['Quedarse', 'Querer hacerlo', 'Calidad', 'Quehacer'], correct: 1, seconds: 20 },
  { question: '¿En qué edición de GLOINT Power Tech estamos?', options: ['1.ª', '2.ª', '3.ª', '4.ª'], correct: 2, seconds: 15 },
  { question: '¿Cuántos escalones hacia la meta ya subimos?', options: ['3', '5', '7', '10'], correct: 0, seconds: 15 },
  { question: '¿Cuántos escalones faltan para llegar a la meta?', options: ['3', '5', '7', '10'], correct: 2, seconds: 15 },
  { question: 'Según la Real Academia Española, emprender es acometer y comenzar…', options: ['Una obra, un negocio, un empeño', 'Un viaje, un sueño, una meta', 'Una deuda, un préstamo, un ahorro', 'Una idea, un plan, un contrato'], correct: 0, seconds: 30 },
  { question: '¿Con qué empezó Samsung en 1938?', options: ['Una fábrica de televisores', 'Una comercializadora de pescado seco, frutas y fideos', 'Una tienda de relojes', 'Una librería'], correct: 1, seconds: 30 },
  { question: '¿Qué hacía Nintendo en 1889?', options: ['Consolas de videojuegos', 'Calculadoras', 'Juguetes de madera', 'Cartas de juego hanafuda hechas a mano'], correct: 3, seconds: 30 },
  { question: '¿Cuál fue el primer unicornio colombiano, en 2018?', options: ['Nubank', 'Rappi', 'Wompi', 'Platzi'], correct: 1, seconds: 20 },
  { question: '¿Qué alquilaron en su apartamento los fundadores de Airbnb?', options: ['Bicicletas', 'Colchones inflables', 'Habitaciones de lujo', 'Carpas'], correct: 1, seconds: 20 },
  { question: 'Amazon empezó como una librería en internet. ¿Dónde arrancó, en 1994?', options: ['En un garaje', 'En un centro comercial', 'En un banco', 'En una fábrica'], correct: 0, seconds: 20 },
  { question: '¿Cuántas empresas se crearon en Colombia en 2024?', options: ['97.000', '150.000', '297.475', '500.000'], correct: 2, seconds: 30 },
  { question: '¿Cuántas de cada 10 empresas colombianas no llegan a cumplir cinco años?', options: ['2', '4', '7', '9'], correct: 2, seconds: 20 },
  { question: '¿Cuál de estas NO es una de las verticales que se conectan a tu empresa?', options: ['Tecnología', 'Logística', 'Turismo', 'Finanzas'], correct: 2, seconds: 25 },
  { question: '¿Cuál es la rentabilidad mensual de hoy?', options: ['3,2 %', '3,7 %', '4,8 %', '5,5 %'], correct: 2, seconds: 20 },
  { question: 'Con los cambios del 2027, ¿cuál será la rentabilidad mensual a 6 meses?', options: ['3,2 %', '3,7 %', '4,8 %', '2,5 %'], correct: 0, seconds: 30 },
  { question: 'Con los cambios del 2027, ¿cuál será la rentabilidad mensual a 12 meses?', options: ['3,2 %', '3,7 %', '4,8 %', '4,0 %'], correct: 1, seconds: 30 },
  { question: '¿Cuál es el precio por acción en 2026?', options: ['$1.500', '$1.937', '$2.720', '$2.100'], correct: 1, seconds: 25 },
  { question: '¿Cuál será el precio por acción en 2027?', options: ['$2.720', '$2.500', '$1.937', '$3.000'], correct: 0, seconds: 25 },
  { question: '¿Cuánto se valoriza la acción de 2026 a 2027?', options: ['20,5 %', '30,0 %', '40,4 %', '50,2 %'], correct: 2, seconds: 25 },
  { question: '¿Hasta cuándo están disponibles los paquetes de acciones?', options: ['30 de noviembre de 2026', '31 de diciembre de 2026', '31 de enero de 2027', '7 de noviembre de 2026'], correct: 1, seconds: 25 },
  { question: '¿Cuántos beneficios tendrá el inversionista GLOINT en 2027?', options: ['4', '6', '8', '10'], correct: 2, seconds: 20 },
  { question: '¿Dónde hay descuentos en productos y servicios de alto valor de empresas aliadas?', options: ['GLOINT PLACE', 'GLOINT BANK', 'GLOINT SHOP', 'GLOINT PAY'], correct: 0, seconds: 25 },
  { question: 'Completa: «Solos vamos rápido, en equipo…»', options: ['Llegamos primero', 'Crecemos más', 'Llegamos lejos', 'Vamos seguros'], correct: 2, seconds: 20 },
];
