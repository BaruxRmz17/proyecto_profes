// src/types.ts
export interface SpecialOrder {
    id: number;
    name: string;
    description: string;
    price: number;
    imageSrc?: string;
    imageAlt?: string;
  }
  
  export interface Extras {
    chocolate: 'none' | 'white' | 'dark';
    blueberries: boolean;
    cherries: boolean;
    note: string;
  }
  