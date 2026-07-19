declare module 'better-sqlite3' {
  class DatabaseImpl {
    constructor(filename: string, options?: any);
    prepare(sql: string): Statement;
    exec(sql: string): DatabaseImpl;
    close(): void;
    pragma(pragma: string, options?: any): any;
  }

  interface Statement {
    run(...params: any[]): any;
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }

  export = DatabaseImpl;
}
