
import * as pg from 'pg';
import * as db from './src';

const pool = new pg.Pool({ connectionString: 'postgresql://localhost/mostly_ormless' });

const tsTypeForPgType = (pgType: string) => {
  switch (pgType) {
    case 'bpchar':
    case 'char':
    case 'varchar':
    case 'text':
    case 'citext':
    case 'uuid':
    case 'bytea':
    case 'inet':
    case 'time':
    case 'timetz':
    case 'interval':
    case 'name':
      return 'string';
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
    case 'money':
    case 'oid':
      return 'number';
    case 'bool':
      return 'boolean';
    case 'json':
    case 'jsonb':
      return 'JSONValue';
    case 'date':
    case 'timestamp':
    case 'timestamptz':
      return 'Date';
    case '_int2':
    case '_int4':
    case '_int8':
    case '_float4':
    case '_float8':
    case '_numeric':
    case '_money':
      return 'number[]';
    case '_bool':
      return 'boolean[]';
    case '_varchar':
    case '_text':
    case '_citext':
    case '_uuid':
    case '_bytea':
      return 'string[]';
    case '_json':
    case '_jsonb':
      return 'JSONArray';
    case '_timestamptz':
      return 'Date[]';
    default:
      console.log(`Type ${pgType} not found: mapped to any`);
      return 'any';
  }
}

const definitionForTableInSchema = async (tableName: string, schemaName: string) => {
  const
    rows = await db.sql<db.SQL>`
      SELECT
        ${"column_name"} AS "column"
      , ${"is_nullable"} = 'YES' AS "nullable"
      , ${"column_default"} IS NOT NULL AS "hasDefault"
      , ${"udt_name"} AS "pgType"
      FROM ${'"information_schema"."columns"'}
      WHERE ${{ table_name: tableName, table_schema: schemaName }}`.run(pool),
    selectables: string[] = [],
    insertables: string[] = [];

    rows.forEach(row => {
      const
        { column, nullable, hasDefault } = row,
        type = tsTypeForPgType(row.pgType),
        insertablyOptional = nullable || hasDefault ? '?' : '',
        orNull = nullable ? ' | null' : '',
        orDateString = type === 'Date' ? ' | DateString' :
          type === 'Date[]' ? ' | DateString[]' : '',
        orDefault = nullable || hasDefault ? ' | DefaultType' : '';

        selectables.push(`${column}: ${type}${orNull};`);
        insertables.push(`${column}${insertablyOptional}: ${type}${orDateString}${orNull}${orDefault} | SQLFragment;`);
      });

  return `
export namespace ${tableName} {
  export type Table = "${tableName}";
  export interface Selectable {
    ${selectables.join('\n    ')}
  };
  export type JSONSelectable = { [K in keyof Selectable]:
    Date extends Selectable[K] ? Exclude<Selectable[K], Date> | DateString : 
      Date[] extends Selectable[K] ? Exclude<Selectable[K], Date[]> | DateString[] : Selectable[K] };
  export interface Insertable {
    ${insertables.join('\n    ')}
  };
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
}`;
}

const tablesInSchema = async (schemaName: string): Promise<string[]> => {
  const rows = await db.sql<db.SQL>`
    SELECT ${"table_name"} FROM ${'"information_schema"."columns"'} 
    WHERE ${{ table_schema: schemaName }} 
    GROUP BY ${"table_name"} ORDER BY lower(${"table_name"})`.run(pool);

  return rows.map(r => r.table_name);
}

const enumTypesForSchema = async (schemaName: string) => {
  const
    rows = await db.sql<db.SQL>`
      SELECT n.${"nspname"} AS "schema", t.${"typname"} AS "name", e.${"enumlabel"} AS value
      FROM ${"pg_type"} t
      JOIN ${"pg_enum"} e ON t.${"oid"} = e.${"enumtypid"}
      JOIN ${'"pg_catalog"."pg_namespace"'} n ON n.${"oid"} = t.${"typnamespace"}
      WHERE n.${"nspname"} = ${db.param(schemaName)}
      ORDER BY t.${"typname"} ASC, e.${"enumlabel"} ASC`.run(pool),

    enums: { [k: string]: string[] } = rows.reduce((memo, row) => {
      memo[row.name] = memo[row.name] ?? [];
      memo[row.name].push(row.value);
      return memo;
    }, {}),

    types = Object.keys(enums)
      .map(name => `
export type ${name} = ${enums[name].map(v => `'${v}'`).join(' | ')};
export namespace every {
  export type ${name} = [${enums[name].map(v => `'${v}'`).join(', ')}];
}`)
      .join('');

  return types;
}

const signaturesForTables = (tableNames: string[]) => `
export type Selectable = ${tableNames.map(name => `${name}.Selectable`).join(' | ')};
export type JSONSelectable = ${tableNames.map(name => `${name}.JSONSelectable`).join(' | ')};
export type Whereable = ${tableNames.map(name => `${name}.Whereable`).join(' | ')};
export type Insertable = ${tableNames.map(name => `${name}.Insertable`).join(' | ')};
export type Updatable = ${tableNames.map(name => `${name}.Updatable`).join(' | ')};
export type Table = ${tableNames.map(name => `${name}.Table`).join(' | ')};
export type Column = ${tableNames.map(name => `${name}.Column`).join(' | ')};
export type AllTables = [${tableNames.map(name => `${name}.Table`).join(', ')}];

export interface InsertSignatures {${tableNames.map(name => `
  (table: ${name}.Table, values: ${name}.Insertable): SQLFragment<${name}.JSONSelectable>;
  (table: ${name}.Table, values: ${name}.Insertable[]): SQLFragment<${name}.JSONSelectable[]>;`).join('')}
}

export interface UpsertSignatures {${tableNames.map(name => `
  (table: ${name}.Table, values: ${name}.Insertable, uniqueCols: ${name}.Column | ${name}.Column[], noNullUpdateCols?: ${name}.Column | ${name}.Column[]): SQLFragment<${name}.UpsertReturnable>;
  (table: ${name}.Table, values: ${name}.Insertable[], uniqueCols: ${name}.Column | ${name}.Column[], noNullUpdateCols?: ${name}.Column | ${name}.Column[]): SQLFragment<${name}.UpsertReturnable[]>;`).join('')}
}

export interface UpdateSignatures {${tableNames.map(name => `
  (table: ${name}.Table, values: ${name}.Updatable, where: ${name}.Whereable | SQLFragment): SQLFragment<${name}.JSONSelectable[]>;`).join('')}
}

export interface DeleteSignatures {${tableNames.map(name => `
  (table: ${name}.Table, where: ${name}.Whereable | SQLFragment): SQLFragment<${name}.JSONSelectable[]>;`).join('')}
}

export interface SelectSignatures {${tableNames.map(name => `
  <C extends ${name}.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap, M extends SelectResultMode = SelectResultMode.Many>(
    table: ${name}.Table,
    where: ${name}.Whereable | SQLFragment | AllType,
    options?: ${name}.SelectOptions<C, L, E>,
    mode?: M,
  ): SQLFragment<${name}.FullSelectReturnType<C, L, E, M>>;`).join('\n')}
}

export interface SelectOneSignatures {${tableNames.map(name => `
  <C extends ${name}.Column[], L extends SQLFragmentsMap, E extends SQLFragmentsMap>(
    table: ${name}.Table,
    where: ${name}.Whereable | SQLFragment | AllType,
    options?: ${name}.SelectOptions<C, L, E>,
  ): SQLFragment<${name}.FullSelectReturnType<C, L, E, SelectResultMode.One>>;`).join('\n')}
}

export interface CountSignatures {${tableNames.map(name => `
  (table: ${name}.Table, where: ${name}.Whereable | SQLFragment | AllType, options?: { columns?: ${name}.Column[], alias?: string }): SQLFragment<number>;`).join('')}
}`;

const header = () => `
/* 
 * generated by zap-ts: anything you change here is liable to get overwritten
 * generated on ${new Date().toISOString()}
 */

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
} from "./core";

`;

interface SchemaRules {
  [schema: string]: {
    include: '*' | string[];
    exclude: '*' | string[];
  }
}

const tsFileForSchemaRules = async (schemas: SchemaRules = { public: { include: '*', exclude: [] }}) =>
  header() + (await Promise.all(
    Object.keys(schemas).map(async schema => {
      const
        rules = schemas[schema],
        tables = rules.exclude === '*' ? [] :
          (rules.include === '*' ? await tablesInSchema(schema) : rules.include)
            .filter(table => rules.exclude.indexOf(table) < 0);

      return `\n/* === schema: ${schema} === */\n` +
        (await enumTypesForSchema(schema)) +
        (await Promise.all(
          tables.map(async table => definitionForTableInSchema(table, schema))
        )).join('\n') +
        signaturesForTables(tables);
    }))
  ).join('\n\n');

(async () => {
  console.log(
    await tsFileForSchemaRules({
      public: {
        include: '*',
        exclude: ['geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews', 'spatial_ref_sys'],
      }
    }));
  pool.end();
})();
