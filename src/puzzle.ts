export type Direction = 'across' | 'down';

export interface WordConfig {
  answer: string;
  row: number;
  col: number;
  direction: Direction;
}

export interface Level {
  id: number;
  difficulty: string;
  letters: string[];
  words: WordConfig[];
}

export const levels: Level[] = [
  {
    id: 1,
    difficulty: 'Fácil',
    letters: ['B', 'A', 'R', 'C', 'O'],
    words: [
      { answer: 'BARCO', row: 0, col: 0, direction: 'across' },
      { answer: 'OBRA', row: 1, col: 0, direction: 'across' },
      { answer: 'ARCO', row: 3, col: 0, direction: 'across' },
      { answer: 'BOCA', row: 0, col: 0, direction: 'down' },
      { answer: 'CABO', row: 0, col: 3, direction: 'down' },
    ],
  },
  {
    id: 2,
    difficulty: 'Médio',
    letters: ['P', 'O', 'R', 'T', 'A', 'S'],
    words: [
      { answer: 'PORTAS', row: 0, col: 0, direction: 'across' },
      { answer: 'PRATO', row: 0, col: 0, direction: 'down' },
      { answer: 'RATO', row: 1, col: 0, direction: 'across' },
      { answer: 'TOPA', row: 0, col: 3, direction: 'down' },
    ],
  },
  {
    id: 3,
    difficulty: 'Difícil',
    letters: ['M', 'A', 'C', 'A', 'C', 'O'],
    words: [
      { answer: 'MACACO', row: 0, col: 0, direction: 'across' },
      { answer: 'CAMA', row: 0, col: 2, direction: 'down' },
      { answer: 'COMA', row: 0, col: 4, direction: 'down' },
      { answer: 'MACA', row: 3, col: 1, direction: 'across' },
    ],
  }
];
