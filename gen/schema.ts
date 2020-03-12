import {
  JSONValue,
  JSONArray,
  DateString,
  SQLFragment,
  GenericSQLExpression,
  ColumnNames,
  ColumnValues,
  ParentColumn,
  DefaultType,
  AllType,
  UpsertAction,
  SelectResultMode,
  SQLFragmentsMap,
  PromisedSQLFragmentReturnTypeMap,
} from "../src";


export namespace pg_catalog.pg_type {
  export type Table = '"pg_catalog"."pg_type"';
  export interface Selectable {
    typname: string;
    typnamespace: string;
  }
  export type JSONSelectable = { [K in keyof Selectable]:
    Date extends Selectable[K] ? Exclude<Selectable[K], Date> | DateString : Selectable[K] };
  export interface Insertable {
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Insertable]?: Exclude<Insertable[K] | ParentColumn, null | DefaultType> };
  export interface UpsertReturnable extends JSONSelectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type OnlyCols<T extends readonly Column[]> = Pick<Selectable, T[number]>;
  export type JSONOnlyCols<T extends readonly Column[]> = Pick<JSONSelectable, T[number]>;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable | (keyof Updatable)[]> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL;
    direction: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
  }
  export interface SelectOptions<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> {
    order?: OrderSpec[];
    limit?: number;
    offset?: number;
    columns?: C;
    extras?: E,
    lateral?: L;
    alias?: string;
  }
  type BaseSelectReturnType<C extends Column[]> = C extends undefined ? JSONSelectable : JSONOnlyCols<C>;
  type EnhancedSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> =
    L extends undefined ?
    (E extends undefined ? BaseSelectReturnType<C> : BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<E>) :
    (E extends undefined ?
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> :
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> & PromisedSQLFragmentReturnTypeMap<E>);
  export type FullSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode> =
    M extends SelectResultMode.Many ? EnhancedSelectReturnType<C, L, E>[] :
    M extends SelectResultMode.One ? EnhancedSelectReturnType<C, L, E> | undefined : number;
}

export namespace pg_catalog.pg_enum {
  export type Table = '"pg_catalog"."pg_enum"';
  export interface Selectable {
    enumtypid: number;
    enumlabel: string;
  }
  export type JSONSelectable = { [K in keyof Selectable]:
    Date extends Selectable[K] ? Exclude<Selectable[K], Date> | DateString : Selectable[K] };
  export interface Insertable {
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Insertable]?: Exclude<Insertable[K] | ParentColumn, null | DefaultType> };
  export interface UpsertReturnable extends JSONSelectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type OnlyCols<T extends readonly Column[]> = Pick<Selectable, T[number]>;
  export type JSONOnlyCols<T extends readonly Column[]> = Pick<JSONSelectable, T[number]>;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable | (keyof Updatable)[]> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL;
    direction: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
  }
  export interface SelectOptions<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> {
    order?: OrderSpec[];
    limit?: number;
    offset?: number;
    columns?: C;
    extras?: E,
    lateral?: L;
    alias?: string;
  }
  type BaseSelectReturnType<C extends Column[]> = C extends undefined ? JSONSelectable : JSONOnlyCols<C>;
  type EnhancedSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> =
    L extends undefined ?
    (E extends undefined ? BaseSelectReturnType<C> : BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<E>) :
    (E extends undefined ?
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> :
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> & PromisedSQLFragmentReturnTypeMap<E>);
  export type FullSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode> =
    M extends SelectResultMode.Many ? EnhancedSelectReturnType<C, L, E>[] :
    M extends SelectResultMode.One ? EnhancedSelectReturnType<C, L, E> | undefined : number;
}

export namespace pg_catalog.pg_namespace {
  export type Table = '"pg_catalog"."pg_namespace"';
  export interface Selectable {
    oid: number;
    nspname: string;
  }
  export type JSONSelectable = { [K in keyof Selectable]:
    Date extends Selectable[K] ? Exclude<Selectable[K], Date> | DateString : Selectable[K] };
  export interface Insertable {
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Insertable]?: Exclude<Insertable[K] | ParentColumn, null | DefaultType> };
  export interface UpsertReturnable extends JSONSelectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type OnlyCols<T extends readonly Column[]> = Pick<Selectable, T[number]>;
  export type JSONOnlyCols<T extends readonly Column[]> = Pick<JSONSelectable, T[number]>;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable | (keyof Updatable)[]> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL;
    direction: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
  }
  export interface SelectOptions<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> {
    order?: OrderSpec[];
    limit?: number;
    offset?: number;
    columns?: C;
    extras?: E,
    lateral?: L;
    alias?: string;
  }
  type BaseSelectReturnType<C extends Column[]> = C extends undefined ? JSONSelectable : JSONOnlyCols<C>;
  type EnhancedSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> =
    L extends undefined ?
    (E extends undefined ? BaseSelectReturnType<C> : BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<E>) :
    (E extends undefined ?
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> :
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> & PromisedSQLFragmentReturnTypeMap<E>);
  export type FullSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode> =
    M extends SelectResultMode.Many ? EnhancedSelectReturnType<C, L, E>[] :
    M extends SelectResultMode.One ? EnhancedSelectReturnType<C, L, E> | undefined : number;
}

export namespace information_schema.columns {
  export type Table = '"information_schema"."columns"';
  export interface Selectable {
    table_name: string;
    table_schema: string;
    column_name: string;
    udt_name: string;
    is_nullable: 'YES' | 'NO';
    column_default: string;
  }
  export type JSONSelectable = { [K in keyof Selectable]:
    Date extends Selectable[K] ? Exclude<Selectable[K], Date> | DateString : Selectable[K] };
  export interface Insertable {
  }
  export interface Updatable extends Partial<Insertable> { };
  export type Whereable = { [K in keyof Insertable]?: Exclude<Insertable[K] | ParentColumn, null | DefaultType> };
  export interface UpsertReturnable extends JSONSelectable, UpsertAction { };
  export type Column = keyof Selectable;
  export type OnlyCols<T extends readonly Column[]> = Pick<Selectable, T[number]>;
  export type JSONOnlyCols<T extends readonly Column[]> = Pick<JSONSelectable, T[number]>;
  export type SQLExpression = GenericSQLExpression | Table | Whereable | Column | ColumnNames<Updatable | (keyof Updatable)[]> | ColumnValues<Updatable>;
  export type SQL = SQLExpression | SQLExpression[];
  export interface OrderSpec {
    by: SQL;
    direction: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
  }
  export interface SelectOptions<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> {
    order?: OrderSpec[];
    limit?: number;
    offset?: number;
    columns?: C;
    extras?: E,
    lateral?: L;
    alias?: string;
  }
  type BaseSelectReturnType<C extends Column[]> = C extends undefined ? JSONSelectable : JSONOnlyCols<C>;
  type EnhancedSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap> =
    L extends undefined ?
    (E extends undefined ? BaseSelectReturnType<C> : BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<E>) :
    (E extends undefined ?
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> :
      BaseSelectReturnType<C> & PromisedSQLFragmentReturnTypeMap<L> & PromisedSQLFragmentReturnTypeMap<E>);
  export type FullSelectReturnType<C extends Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode> =
    M extends SelectResultMode.Many ? EnhancedSelectReturnType<C, L, E>[] :
    M extends SelectResultMode.One ? EnhancedSelectReturnType<C, L, E> | undefined : number;
}

export type Selectable = pg_catalog.pg_type.Selectable | pg_catalog.pg_enum.Selectable | pg_catalog.pg_namespace.Selectable | information_schema.columns.Selectable;
export type JSONSelectable = pg_catalog.pg_type.JSONSelectable | pg_catalog.pg_enum.JSONSelectable | pg_catalog.pg_namespace.JSONSelectable | information_schema.columns.JSONSelectable;
export type Whereable = pg_catalog.pg_type.Whereable | pg_catalog.pg_enum.Whereable | pg_catalog.pg_namespace.Whereable | information_schema.columns.Whereable;
export type Insertable = pg_catalog.pg_type.Insertable | pg_catalog.pg_enum.Insertable | pg_catalog.pg_namespace.Insertable | information_schema.columns.Insertable;
export type Updatable = pg_catalog.pg_type.Updatable | pg_catalog.pg_enum.Updatable | pg_catalog.pg_namespace.Updatable | information_schema.columns.Updatable;
export type Table = pg_catalog.pg_type.Table | pg_catalog.pg_enum.Table | pg_catalog.pg_namespace.Table | information_schema.columns.Table;
export type Column = pg_catalog.pg_type.Column | pg_catalog.pg_enum.Column | pg_catalog.pg_namespace.Column | information_schema.columns.Column;
export type AllTables = [pg_catalog.pg_type.Table, pg_catalog.pg_enum.Table, pg_catalog.pg_namespace.Table, information_schema.columns.Table];

export interface InsertSignatures {
  (table: pg_catalog.pg_type.Table, values: pg_catalog.pg_type.Insertable): SQLFragment<pg_catalog.pg_type.JSONSelectable>;
  (table: pg_catalog.pg_type.Table, values: pg_catalog.pg_type.Insertable[]): SQLFragment<pg_catalog.pg_type.JSONSelectable[]>;
  (table: pg_catalog.pg_enum.Table, values: pg_catalog.pg_enum.Insertable): SQLFragment<pg_catalog.pg_enum.JSONSelectable>;
  (table: pg_catalog.pg_enum.Table, values: pg_catalog.pg_enum.Insertable[]): SQLFragment<pg_catalog.pg_enum.JSONSelectable[]>;
  (table: pg_catalog.pg_namespace.Table, values: pg_catalog.pg_namespace.Insertable): SQLFragment<pg_catalog.pg_namespace.JSONSelectable>;
  (table: pg_catalog.pg_namespace.Table, values: pg_catalog.pg_namespace.Insertable[]): SQLFragment<pg_catalog.pg_namespace.JSONSelectable[]>;
  (table: information_schema.columns.Table, values: information_schema.columns.Insertable): SQLFragment<information_schema.columns.JSONSelectable>;
  (table: information_schema.columns.Table, values: information_schema.columns.Insertable[]): SQLFragment<information_schema.columns.JSONSelectable[]>;
}
export interface UpsertSignatures {
  (table: pg_catalog.pg_type.Table, values: pg_catalog.pg_type.Insertable, uniqueCols: pg_catalog.pg_type.Column | pg_catalog.pg_type.Column[], noNullUpdateCols?: pg_catalog.pg_type.Column | pg_catalog.pg_type.Column[]): SQLFragment<pg_catalog.pg_type.UpsertReturnable>;
  (table: pg_catalog.pg_type.Table, values: pg_catalog.pg_type.Insertable[], uniqueCols: pg_catalog.pg_type.Column | pg_catalog.pg_type.Column[], noNullUpdateCols?: pg_catalog.pg_type.Column | pg_catalog.pg_type.Column[]): SQLFragment<pg_catalog.pg_type.UpsertReturnable[]>;
  (table: pg_catalog.pg_enum.Table, values: pg_catalog.pg_enum.Insertable, uniqueCols: pg_catalog.pg_enum.Column | pg_catalog.pg_enum.Column[], noNullUpdateCols?: pg_catalog.pg_enum.Column | pg_catalog.pg_enum.Column[]): SQLFragment<pg_catalog.pg_enum.UpsertReturnable>;
  (table: pg_catalog.pg_enum.Table, values: pg_catalog.pg_enum.Insertable[], uniqueCols: pg_catalog.pg_enum.Column | pg_catalog.pg_enum.Column[], noNullUpdateCols?: pg_catalog.pg_enum.Column | pg_catalog.pg_enum.Column[]): SQLFragment<pg_catalog.pg_enum.UpsertReturnable[]>;
  (table: pg_catalog.pg_namespace.Table, values: pg_catalog.pg_namespace.Insertable, uniqueCols: pg_catalog.pg_namespace.Column | pg_catalog.pg_namespace.Column[], noNullUpdateCols?: pg_catalog.pg_namespace.Column | pg_catalog.pg_namespace.Column[]): SQLFragment<pg_catalog.pg_namespace.UpsertReturnable>;
  (table: pg_catalog.pg_namespace.Table, values: pg_catalog.pg_namespace.Insertable[], uniqueCols: pg_catalog.pg_namespace.Column | pg_catalog.pg_namespace.Column[], noNullUpdateCols?: pg_catalog.pg_namespace.Column | pg_catalog.pg_namespace.Column[]): SQLFragment<pg_catalog.pg_namespace.UpsertReturnable[]>;
  (table: information_schema.columns.Table, values: information_schema.columns.Insertable, uniqueCols: information_schema.columns.Column | information_schema.columns.Column[], noNullUpdateCols?: information_schema.columns.Column | information_schema.columns.Column[]): SQLFragment<information_schema.columns.UpsertReturnable>;
  (table: information_schema.columns.Table, values: information_schema.columns.Insertable[], uniqueCols: information_schema.columns.Column | information_schema.columns.Column[], noNullUpdateCols?: information_schema.columns.Column | information_schema.columns.Column[]): SQLFragment<information_schema.columns.UpsertReturnable[]>;
}
export interface UpdateSignatures {
  (table: pg_catalog.pg_type.Table, values: pg_catalog.pg_type.Updatable, where: pg_catalog.pg_type.Whereable | SQLFragment): SQLFragment<pg_catalog.pg_type.JSONSelectable[]>;
  (table: pg_catalog.pg_enum.Table, values: pg_catalog.pg_enum.Updatable, where: pg_catalog.pg_enum.Whereable | SQLFragment): SQLFragment<pg_catalog.pg_enum.JSONSelectable[]>;
  (table: pg_catalog.pg_namespace.Table, values: pg_catalog.pg_namespace.Updatable, where: pg_catalog.pg_namespace.Whereable | SQLFragment): SQLFragment<pg_catalog.pg_namespace.JSONSelectable[]>;
  (table: information_schema.columns.Table, values: information_schema.columns.Updatable, where: information_schema.columns.Whereable | SQLFragment): SQLFragment<information_schema.columns.JSONSelectable[]>;
}
export interface DeleteSignatures {
  (table: pg_catalog.pg_type.Table, where: pg_catalog.pg_type.Whereable | SQLFragment): SQLFragment<pg_catalog.pg_type.JSONSelectable[]>;
  (table: pg_catalog.pg_enum.Table, where: pg_catalog.pg_enum.Whereable | SQLFragment): SQLFragment<pg_catalog.pg_enum.JSONSelectable[]>;
  (table: pg_catalog.pg_namespace.Table, where: pg_catalog.pg_namespace.Whereable | SQLFragment): SQLFragment<pg_catalog.pg_namespace.JSONSelectable[]>;
  (table: information_schema.columns.Table, where: information_schema.columns.Whereable | SQLFragment): SQLFragment<information_schema.columns.JSONSelectable[]>;
}
export interface SelectSignatures {

  <C extends pg_catalog.pg_type.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode = SelectResultMode.Many>(
    table: pg_catalog.pg_type.Table,
    where: pg_catalog.pg_type.Whereable | SQLFragment | AllType,
    options?: pg_catalog.pg_type.SelectOptions<C, L, E>,
    mode?: M,
  ): SQLFragment<pg_catalog.pg_type.FullSelectReturnType<C, L, E, M>>;

  <C extends pg_catalog.pg_enum.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode = SelectResultMode.Many>(
    table: pg_catalog.pg_enum.Table,
    where: pg_catalog.pg_enum.Whereable | SQLFragment | AllType,
    options?: pg_catalog.pg_enum.SelectOptions<C, L, E>,
    mode?: M,
  ): SQLFragment<pg_catalog.pg_enum.FullSelectReturnType<C, L, E, M>>;

  <C extends pg_catalog.pg_namespace.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode = SelectResultMode.Many>(
    table: pg_catalog.pg_namespace.Table,
    where: pg_catalog.pg_namespace.Whereable | SQLFragment | AllType,
    options?: pg_catalog.pg_namespace.SelectOptions<C, L, E>,
    mode?: M,
  ): SQLFragment<pg_catalog.pg_namespace.FullSelectReturnType<C, L, E, M>>;

  <C extends information_schema.columns.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode = SelectResultMode.Many>(
    table: information_schema.columns.Table,
    where: information_schema.columns.Whereable | SQLFragment | AllType,
    options?: information_schema.columns.SelectOptions<C, L, E>,
    mode?: M,
  ): SQLFragment<information_schema.columns.FullSelectReturnType<C, L, E, M>>;
}
export interface SelectOneSignatures {

  <C extends pg_catalog.pg_type.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap>(
    table: pg_catalog.pg_type.Table,
    where: pg_catalog.pg_type.Whereable | SQLFragment | AllType,
    options?: pg_catalog.pg_type.SelectOptions<C, L, E>,
  ): SQLFragment<pg_catalog.pg_type.FullSelectReturnType<C, L, E, SelectResultMode.One>>;

  <C extends pg_catalog.pg_enum.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap>(
    table: pg_catalog.pg_enum.Table,
    where: pg_catalog.pg_enum.Whereable | SQLFragment | AllType,
    options?: pg_catalog.pg_enum.SelectOptions<C, L, E>,
  ): SQLFragment<pg_catalog.pg_enum.FullSelectReturnType<C, L, E, SelectResultMode.One>>;

  <C extends pg_catalog.pg_namespace.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap>(
    table: pg_catalog.pg_namespace.Table,
    where: pg_catalog.pg_namespace.Whereable | SQLFragment | AllType,
    options?: pg_catalog.pg_namespace.SelectOptions<C, L, E>,
  ): SQLFragment<pg_catalog.pg_namespace.FullSelectReturnType<C, L, E, SelectResultMode.One>>;

  <C extends information_schema.columns.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap>(
    table: information_schema.columns.Table,
    where: information_schema.columns.Whereable | SQLFragment | AllType,
    options?: information_schema.columns.SelectOptions<C, L, E>,
  ): SQLFragment<information_schema.columns.FullSelectReturnType<C, L, E, SelectResultMode.One>>;
}
export interface CountSignatures {
  (table: pg_catalog.pg_type.Table, where: pg_catalog.pg_type.Whereable | SQLFragment | AllType, options?: { columns?: pg_catalog.pg_type.Column[], alias?: string }): SQLFragment<number>;
  (table: pg_catalog.pg_enum.Table, where: pg_catalog.pg_enum.Whereable | SQLFragment | AllType, options?: { columns?: pg_catalog.pg_enum.Column[], alias?: string }): SQLFragment<number>;
  (table: pg_catalog.pg_namespace.Table, where: pg_catalog.pg_namespace.Whereable | SQLFragment | AllType, options?: { columns?: pg_catalog.pg_namespace.Column[], alias?: string }): SQLFragment<number>;
  (table: information_schema.columns.Table, where: information_schema.columns.Whereable | SQLFragment | AllType, options?: { columns?: information_schema.columns.Column[], alias?: string }): SQLFragment<number>;
}
