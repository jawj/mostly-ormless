/* tslint:disable */

/**
 * AUTO-GENERATED FILE @ 2019-06-27 21:08:36 - DO NOT EDIT!
 *
 * This file was automatically generated by schemats v.3.0.3
 * $ schemats generate -c postgres://username:password@localhost/ormless_demo -t appleTransactions -t authors -t books -t emailAuthentication -s public
 *
 */

import {
  DefaultType,
  JSONValue,
  JSONArray,
  SQLFragment,
  GenericSQLExpression,
  ColumnNames,
  ColumnValues,
  Queryable,
  UpsertAction,
} from "./db";

export type appleEnvironment = 'PROD' | 'Sandbox';
export namespace every {
  export type appleEnvironment = ['PROD', 'Sandbox'];
}

export namespace appleTransactions {
  export type Table = "appleTransactions";
  export interface Selectable {
    environment: appleEnvironment;
    originalTransactionId: string;
    accountId: number;
    latestReceiptData: string | null;
  }
  export interface Insertable {
    environment: appleEnvironment | SQLFragment;
    originalTransactionId: string | SQLFragment;
    accountId: number | SQLFragment;
    latestReceiptData?: string | null | DefaultType | SQLFragment;
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Selectable]?: Selectable[K] | SQLFragment };
  export interface UpsertReturnable extends Selectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL,
    direction: 'ASC' | 'DESC',
    nulls?: 'FIRST' | 'LAST',
  }
  export interface SelectOptions {
    order?: OrderSpec[];
    limit?: number,
    offset?: number,
  }
}

export namespace authors {
  export type Table = "authors";
  export interface Selectable {
    id: number;
    name: string;
    isLiving: boolean | null;
  }
  export interface Insertable {
    id?: number | DefaultType | SQLFragment;
    name: string | SQLFragment;
    isLiving?: boolean | null | DefaultType | SQLFragment;
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Selectable]?: Selectable[K] | SQLFragment };
  export interface UpsertReturnable extends Selectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL,
    direction: 'ASC' | 'DESC',
    nulls?: 'FIRST' | 'LAST',
  }
  export interface SelectOptions {
    order?: OrderSpec[];
    limit?: number,
    offset?: number,
  }
}

export namespace books {
  export type Table = "books";
  export interface Selectable {
    id: number;
    authorId: number;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }
  export interface Insertable {
    id?: number | DefaultType | SQLFragment;
    authorId: number | SQLFragment;
    title?: string | null | DefaultType | SQLFragment;
    createdAt?: Date | DefaultType | SQLFragment;
    updatedAt?: Date | DefaultType | SQLFragment;
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Selectable]?: Selectable[K] | SQLFragment };
  export interface UpsertReturnable extends Selectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL,
    direction: 'ASC' | 'DESC',
    nulls?: 'FIRST' | 'LAST',
  }
  export interface SelectOptions {
    order?: OrderSpec[];
    limit?: number,
    offset?: number,
  }
}

export namespace emailAuthentication {
  export type Table = "emailAuthentication";
  export interface Selectable {
    email: string;
    consecutiveFailedLogins: number;
    lastFailedLogin: Date | null;
  }
  export interface Insertable {
    email: string | SQLFragment;
    consecutiveFailedLogins?: number | DefaultType | SQLFragment;
    lastFailedLogin?: Date | null | DefaultType | SQLFragment;
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Selectable]?: Selectable[K] | SQLFragment };
  export interface UpsertReturnable extends Selectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL,
    direction: 'ASC' | 'DESC',
    nulls?: 'FIRST' | 'LAST',
  }
  export interface SelectOptions {
    order?: OrderSpec[];
    limit?: number,
    offset?: number,
  }
}

export type Selectable = appleTransactions.Selectable | authors.Selectable | books.Selectable | emailAuthentication.Selectable;
export type Whereable = appleTransactions.Whereable | authors.Whereable | books.Whereable | emailAuthentication.Whereable;
export type Insertable = appleTransactions.Insertable | authors.Insertable | books.Insertable | emailAuthentication.Insertable;
export type Updatable = appleTransactions.Updatable | authors.Updatable | books.Updatable | emailAuthentication.Updatable;
export type Table = appleTransactions.Table | authors.Table | books.Table | emailAuthentication.Table;
export type Column = appleTransactions.Column | authors.Column | books.Column | emailAuthentication.Column;
export type AllTables = [appleTransactions.Table, authors.Table, books.Table, emailAuthentication.Table];

export interface InsertSignatures {
  (client: Queryable, table: appleTransactions.Table, values: appleTransactions.Insertable): Promise<appleTransactions.Selectable>;
  (client: Queryable, table: appleTransactions.Table, values: appleTransactions.Insertable[]): Promise<appleTransactions.Selectable[]>;
  (client: Queryable, table: authors.Table, values: authors.Insertable): Promise<authors.Selectable>;
  (client: Queryable, table: authors.Table, values: authors.Insertable[]): Promise<authors.Selectable[]>;
  (client: Queryable, table: books.Table, values: books.Insertable): Promise<books.Selectable>;
  (client: Queryable, table: books.Table, values: books.Insertable[]): Promise<books.Selectable[]>;
  (client: Queryable, table: emailAuthentication.Table, values: emailAuthentication.Insertable): Promise<emailAuthentication.Selectable>;
  (client: Queryable, table: emailAuthentication.Table, values: emailAuthentication.Insertable[]): Promise<emailAuthentication.Selectable[]>;
}
export interface UpsertSignatures {
  (client: Queryable, table: appleTransactions.Table, values: appleTransactions.Insertable, uniqueCols: appleTransactions.Column | appleTransactions.Column[], noNullUpdateCols?: appleTransactions.Column | appleTransactions.Column[]): Promise<appleTransactions.UpsertReturnable>;
  (client: Queryable, table: appleTransactions.Table, values: appleTransactions.Insertable[], uniqueCols: appleTransactions.Column | appleTransactions.Column[], noNullUpdateCols?: appleTransactions.Column | appleTransactions.Column[]): Promise<appleTransactions.UpsertReturnable[]>;
  (client: Queryable, table: authors.Table, values: authors.Insertable, uniqueCols: authors.Column | authors.Column[], noNullUpdateCols?: authors.Column | authors.Column[]): Promise<authors.UpsertReturnable>;
  (client: Queryable, table: authors.Table, values: authors.Insertable[], uniqueCols: authors.Column | authors.Column[], noNullUpdateCols?: authors.Column | authors.Column[]): Promise<authors.UpsertReturnable[]>;
  (client: Queryable, table: books.Table, values: books.Insertable, uniqueCols: books.Column | books.Column[], noNullUpdateCols?: books.Column | books.Column[]): Promise<books.UpsertReturnable>;
  (client: Queryable, table: books.Table, values: books.Insertable[], uniqueCols: books.Column | books.Column[], noNullUpdateCols?: books.Column | books.Column[]): Promise<books.UpsertReturnable[]>;
  (client: Queryable, table: emailAuthentication.Table, values: emailAuthentication.Insertable, uniqueCols: emailAuthentication.Column | emailAuthentication.Column[], noNullUpdateCols?: emailAuthentication.Column | emailAuthentication.Column[]): Promise<emailAuthentication.UpsertReturnable>;
  (client: Queryable, table: emailAuthentication.Table, values: emailAuthentication.Insertable[], uniqueCols: emailAuthentication.Column | emailAuthentication.Column[], noNullUpdateCols?: emailAuthentication.Column | emailAuthentication.Column[]): Promise<emailAuthentication.UpsertReturnable[]>;
}
export interface UpdateSignatures {
  (client: Queryable, table: appleTransactions.Table, values: appleTransactions.Updatable, where: appleTransactions.Whereable): Promise<appleTransactions.Selectable[]>;
  (client: Queryable, table: authors.Table, values: authors.Updatable, where: authors.Whereable): Promise<authors.Selectable[]>;
  (client: Queryable, table: books.Table, values: books.Updatable, where: books.Whereable): Promise<books.Selectable[]>;
  (client: Queryable, table: emailAuthentication.Table, values: emailAuthentication.Updatable, where: emailAuthentication.Whereable): Promise<emailAuthentication.Selectable[]>;
}
export interface DeleteSignatures {
  (client: Queryable, table: appleTransactions.Table, where: appleTransactions.Whereable): Promise<appleTransactions.Selectable[]>;
  (client: Queryable, table: authors.Table, where: authors.Whereable): Promise<authors.Selectable[]>;
  (client: Queryable, table: books.Table, where: books.Whereable): Promise<books.Selectable[]>;
  (client: Queryable, table: emailAuthentication.Table, where: emailAuthentication.Whereable): Promise<emailAuthentication.Selectable[]>;
}
export interface SelectSignatures {
  (client: Queryable, table: appleTransactions.Table, where?: appleTransactions.Whereable, options?: appleTransactions.SelectOptions, count?: boolean): Promise<appleTransactions.Selectable[]>;
  (client: Queryable, table: authors.Table, where?: authors.Whereable, options?: authors.SelectOptions, count?: boolean): Promise<authors.Selectable[]>;
  (client: Queryable, table: books.Table, where?: books.Whereable, options?: books.SelectOptions, count?: boolean): Promise<books.Selectable[]>;
  (client: Queryable, table: emailAuthentication.Table, where?: emailAuthentication.Whereable, options?: emailAuthentication.SelectOptions, count?: boolean): Promise<emailAuthentication.Selectable[]>;
}
export interface SelectOneSignatures {
  (client: Queryable, table: appleTransactions.Table, where?: appleTransactions.Whereable, options?: appleTransactions.SelectOptions): Promise<appleTransactions.Selectable | undefined>;
  (client: Queryable, table: authors.Table, where?: authors.Whereable, options?: authors.SelectOptions): Promise<authors.Selectable | undefined>;
  (client: Queryable, table: books.Table, where?: books.Whereable, options?: books.SelectOptions): Promise<books.Selectable | undefined>;
  (client: Queryable, table: emailAuthentication.Table, where?: emailAuthentication.Whereable, options?: emailAuthentication.SelectOptions): Promise<emailAuthentication.Selectable | undefined>;
}
export interface CountSignatures {
  (client: Queryable, table: appleTransactions.Table, where?: appleTransactions.Whereable): Promise<number>;
  (client: Queryable, table: authors.Table, where?: authors.Whereable): Promise<number>;
  (client: Queryable, table: books.Table, where?: books.Whereable): Promise<number>;
  (client: Queryable, table: emailAuthentication.Table, where?: emailAuthentication.Whereable): Promise<number>;
}
