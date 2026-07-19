declare module 'escpos' {
  export const Printer: any;
  export class Adapter {
    constructor(device: any);
    write(data: any): any;
  }
  export class EscPos {
    constructor(device: any, encoding?: string);
    initialize(): EscPos;
    print(text: string): EscPos;
    text(text: string): EscPos;
    newline(): EscPos;
    cut(): EscPos;
    close(): Promise<void>;
  }
}
