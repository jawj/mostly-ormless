import * as pg from 'pg';
import { isDatabaseError } from './pgErrors';
import config from './config';

import {
  InsertSignatures,
  UpdateSignatures,
  DeleteSignatures,
  SelectSignatures,
  SelectOneSignatures,
  CountSignatures,
  Insertable,
  Updatable,
  Whereable,
  Table,
  Column,
  UpsertSignatures,
} from './schema';

export interface DBConfig {
  dbURL: string,
  dbTransactionAttempts: number,
  dbTransactionRetryDelayRange: [number, number],
  verbose: boolean,
}

export const pool = new pg.Pool({ connectionString: config.dbURL });


// === symbols, types, wrapper classes and shortcuts ===

export const Default = Symbol('DEFAULT');
export type DefaultType = typeof Default;

export const self = Symbol('self');
export type SelfType = typeof self;

export const all = Symbol('all');
export type AllType = typeof all;

// see https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
export type JSONValue = null | boolean | number | string | JSONObject | JSONArray;
export interface JSONObject { [k: string]: JSONValue; }
export interface JSONArray extends Array<JSONValue> { }


export class Parameter { constructor(public value: any) { } }
export function param(x: any) { return new Parameter(x); }

export class DangerousRawString { constructor(public value: string) { } }
export function raw(x: string) { return new DangerousRawString(x); }

export class ColumnNames<T> { constructor(public value: T) { } }
export function cols<T>(x: T) { return new ColumnNames<T>(x); }

export class ColumnValues<T> { constructor(public value: T) { } }
export function vals<T>(x: T) { return new ColumnValues<T>(x); }

export class ParentColumn { constructor(public value: Column) { } }
export function parent(x: Column) { return new ParentColumn(x); }

export type GenericSQLExpression = SQLFragment<any> | Parameter | DefaultType | DangerousRawString | SelfType;
export type SQLExpression = Table | ColumnNames<Updatable | (keyof Updatable)[]> | ColumnValues<Updatable> | Whereable | Column | GenericSQLExpression;
export type SQL = SQLExpression | SQLExpression[];


export interface SQLFragmentsMap { [k: string]: SQLFragment<any> };
export type PromisedType<P> = P extends Promise<infer U> ? U : never;
export type PromisedSQLFragmentReturnType<R extends SQLFragment<any>> = PromisedType<ReturnType<R['run']>>;
export type PromisedSQLFragmentReturnTypeMap<L extends SQLFragmentsMap> = { [K in keyof L]: PromisedSQLFragmentReturnType<L[K]> };


// === simple query helpers ===

export type Queryable = pg.Pool | PoolClient<any>;

export const insert: InsertSignatures = function
  (table: Table, values: Insertable | Insertable[]): SQLFragment<any> {

  const
    completedValues = Array.isArray(values) ? completeKeysWithDefault(values) : values,
    colsSQL = cols(Array.isArray(completedValues) ? completedValues[0] : completedValues),
    valuesSQL = Array.isArray(completedValues) ?
      mapWithSeparator(completedValues as Insertable[], sql<SQL>`, `, v => sql<SQL>`(${vals(v)})`) :
      sql<SQL>`(${vals(completedValues)})`,
    query = sql<SQL>`INSERT INTO ${table} (${colsSQL}) VALUES ${valuesSQL} RETURNING *`;

  if (!Array.isArray(completedValues)) query.runResultTransform = (qr) => qr.rows[0];
  return query;
}


export interface UpsertAction { $action: 'INSERT' | 'UPDATE' };

export const upsert: UpsertSignatures = function
  (table: Table, values: Insertable | Insertable[], uniqueCols: Column | Column[], noNullUpdateCols: Column | Column[] = []): SQLFragment<any> {

  if (!Array.isArray(uniqueCols)) uniqueCols = [uniqueCols];
  if (!Array.isArray(noNullUpdateCols)) noNullUpdateCols = [noNullUpdateCols];

  const
    completedValues = Array.isArray(values) ? completeKeysWithDefault(values) : values,
    colsSQL = cols(Array.isArray(completedValues) ? completedValues[0] : completedValues),
    valuesSQL = Array.isArray(completedValues) ?
      mapWithSeparator(completedValues as Insertable[], sql`, `, v => sql`(${vals(v)})`) :
      sql`(${vals(completedValues)})`,
    nonUniqueCols = (Object.keys(Array.isArray(completedValues) ? completedValues[0] : completedValues) as Column[])
      .filter(v => !uniqueCols.includes(v)),
    uniqueColsSQL = mapWithSeparator(uniqueCols.slice().sort(), sql`, `, c => c),
    updateColsSQL = mapWithSeparator(nonUniqueCols.slice().sort(), sql`, `, c => c),
    updateValuesSQL = mapWithSeparator(nonUniqueCols.slice().sort(), sql`, `, c =>
      noNullUpdateCols.includes(c) ? sql`CASE WHEN EXCLUDED.${c} IS NULL THEN ${table}.${c} ELSE EXCLUDED.${c} END` : sql`EXCLUDED.${c}`);

  // the added-on $action = 'INSERT' | 'UPDATE' key takes after SQL Server's approach to MERGE
  // (and on the use of xmax for this purpose, see: https://stackoverflow.com/questions/39058213/postgresql-upsert-differentiate-inserted-and-updated-rows-using-system-columns-x)

  const query = sql<SQL>`INSERT INTO ${table} (${colsSQL}) VALUES ${valuesSQL} ON CONFLICT (${uniqueColsSQL}) DO UPDATE SET (${updateColsSQL}) = ROW(${updateValuesSQL}) RETURNING *, CASE xmax WHEN 0 THEN 'INSERT' ELSE 'UPDATE' END AS "$action"`;

  if (!Array.isArray(completedValues)) query.runResultTransform = (qr) => qr.rows[0];
  return query;
}

export const update: UpdateSignatures = function (
  table: Table,
  values: Updatable,
  where: Whereable | SQLFragment): SQLFragment {

  // note: the ROW() constructor below is required in Postgres 10+ if we're updating a single column
  // more info: https://www.postgresql-archive.org/Possible-regression-in-UPDATE-SET-lt-column-list-gt-lt-row-expression-gt-with-just-one-single-column0-td5989074.html

  const query = sql<SQL>`UPDATE ${table} SET (${cols(values)}) = ROW(${vals(values)}) WHERE ${where} RETURNING *`;
  return query;
}

export const deletes: DeleteSignatures = function  // sadly, delete is a reserved word
  (table: Table, where: Whereable | SQLFragment): SQLFragment {

  const query = sql<SQL>`DELETE FROM ${table} WHERE ${where} RETURNING *`;
  return query;
}

type TruncateIdentityOpts = 'CONTINUE IDENTITY' | 'RESTART IDENTITY';
type TruncateForeignKeyOpts = 'RESTRICT' | 'CASCADE';

interface TruncateSignatures {
  (table: Table | Table[], optId: TruncateIdentityOpts): SQLFragment<undefined>;
  (table: Table | Table[], optFK: TruncateForeignKeyOpts): SQLFragment<undefined>;
  (table: Table | Table[], optId: TruncateIdentityOpts, optFK: TruncateForeignKeyOpts): SQLFragment<undefined>;
}

export const truncate: TruncateSignatures = function
  (table: Table | Table[], ...opts: string[]): SQLFragment<undefined> {

  if (!Array.isArray(table)) table = [table];
  const
    tables = mapWithSeparator(table, sql`, `, t => t),
    query = sql<SQL, undefined>`TRUNCATE ${tables}${raw((opts.length ? ' ' : '') + opts.join(' '))}`;
  
  return query;
}


interface OrderSpec {
  by: SQL,
  direction: 'ASC' | 'DESC',
  nulls?: 'FIRST' | 'LAST',
}

export enum SelectResultMode {
  Many,
  One,
  Count,
}

interface SelectOptions {
  order?: OrderSpec[];
  limit?: number,
  offset?: number,
  columns?: Column[],
  extras?: SQLFragmentsMap;
  lateral?: SQLFragmentsMap;
  alias?: string;
}

export const select: SelectSignatures = function (
  rawTable: Table,
  where: Whereable | SQLFragment | AllType = all,
  rawOptions: SelectOptions = {},
  mode: SelectResultMode = SelectResultMode.Many,
) {
  const
    options = mode === SelectResultMode.One ? Object.assign({}, rawOptions, { limit: 1 }) : rawOptions,
    table = options.alias || rawTable,
    tableAliasSQL = table === rawTable ? [] : sql` AS ${table}`,
    colsSQL = mode === SelectResultMode.Count ?
      (options.columns ? sql`count(${cols(options.columns)})` : sql`count(${table}.*)`) :
      options.columns ?
        sql`jsonb_build_object(${mapWithSeparator(options.columns, sql`, `, c => raw(`'${c}', "${c}"`))})` :
        sql`to_jsonb(${table}.*)`,
    colsLateralSQL = options.lateral === undefined ? [] :
      sql` || jsonb_build_object(${mapWithSeparator(
        Object.keys(options.lateral), sql`, `, k => raw(`'${k}', "cj_${k}".result`))})`,
    colsExtraSQL = options.extras === undefined ? [] :
      sql` || jsonb_build_object(${mapWithSeparator(
        Object.keys(options.extras), sql`, `, k => [raw(`'${k}', `), options.extras![k]])})`,
    allColsSQL = sql`${colsSQL}${colsLateralSQL}${colsExtraSQL}`,
    whereSQL = where === all ? [] : [sql` WHERE `, where],
    orderSQL = !options.order ? [] :
      [sql` ORDER BY `, ...mapWithSeparator(options.order, sql`, `, o =>
        sql`${o.by} ${raw(o.direction)}${o.nulls ? sql` NULLS ${raw(o.nulls)}` : []}`)],
    limitSQL = options.limit === undefined ? [] : sql` LIMIT ${raw(String(options.limit))}`,
    offsetSQL = options.offset === undefined ? [] : sql` OFFSET ${raw(String(options.offset))}`,
    lateralSQL = options.lateral === undefined ? [] : Object.keys(options.lateral).map(k => {
      const subQ = options.lateral![k];
      subQ.parentTable = table;  // enables db.parent('column') in nested query Wherables
      return sql<SQL>` LEFT JOIN LATERAL (${subQ}) AS ${raw(`"cj_${k}"`)} ON true`;
    });

  const
    rowsQuery = sql<SQL>`SELECT ${allColsSQL} AS result FROM ${rawTable}${tableAliasSQL}${lateralSQL}${whereSQL}${orderSQL}${limitSQL}${offsetSQL}`,
    query = mode !== SelectResultMode.Many ? rowsQuery :
      // we need the aggregate to sit in a sub-SELECT in order to keep ORDER and LIMIT working as usual
      sql<SQL>`SELECT coalesce(jsonb_agg(result), '[]') AS result FROM (${rowsQuery}) AS ${raw(`"sq_${table}"`)}`;
  
  query.runResultTransform = mode === SelectResultMode.Count ? 
    (qr) => Number(qr.rows[0].result) :
    (qr) => qr.rows[0].result;
  
  return query;
}

export const selectOne: SelectOneSignatures = function (
  table: Table,
  where: Whereable | SQLFragment | AllType = all,
  options: SelectOptions = {},
) {
  // you might argue that 'selectOne' offers little that you can't get with destructuring assignment 
  // and plain 'select' -- e.g. let [x] = async select(...).run(pool); -- but a thing that is definitely worth 
  // having is '| undefined' in the return signature, because the result of indexing never includes undefined
  // (see e.g. https://github.com/Microsoft/TypeScript/issues/13778)
  
  return select(<any>table, <any>where, <any>options, SelectResultMode.One);
}

export const count: CountSignatures = function (
  table: Table,
  where: Whereable | SQLFragment | AllType = all,
  options?: { columns?: Column[], alias?: string },
) {

  return select(<any>table, <any>where, <any>options, SelectResultMode.Count);
}


// === transactions support ===

export enum Isolation {
  // these are the only meaningful values in Postgres: 
  // see https://www.postgresql.org/docs/11/sql-set-transaction.html

  Serializable = "SERIALIZABLE",
  RepeatableRead = "REPEATABLE READ",
  ReadCommitted = "READ COMMITTED",
  SerializableRO = "SERIALIZABLE, READ ONLY",
  RepeatableReadRO = "REPEATABLE READ, READ ONLY",
  ReadCommittedRO = "READ COMMITTED, READ ONLY",
  SerializableRODeferrable = "SERIALIZABLE, READ ONLY, DEFERRABLE",
}

export namespace TxnSatisfying {
  export type Serializable = Isolation.Serializable;
  export type RepeatableRead = Serializable | Isolation.RepeatableRead;
  export type ReadCommitted = RepeatableRead | Isolation.ReadCommitted;
  export type SerializableRO = Serializable | Isolation.SerializableRO;
  export type RepeatableReadRO = SerializableRO | RepeatableRead | Isolation.RepeatableReadRO;
  export type ReadCommittedRO = RepeatableReadRO | ReadCommitted | Isolation.ReadCommittedRO;
  export type SerializableRODeferrable = SerializableRO | Isolation.SerializableRODeferrable;
}

export interface PoolClient<T extends Isolation | undefined> extends pg.PoolClient {
  transactionMode: T;
}

let txnSeq = 0;

export async function transaction<T, M extends Isolation>(
  isolationMode: M, callback: (client: PoolClient<M>) => Promise<T>
): Promise<T> {

  const
    txnId = txnSeq++,
    txnClient = await pool.connect() as PoolClient<typeof isolationMode>,
    maxAttempts = config.dbTransactionAttempts,
    [delayMin, delayMax] = config.dbTransactionRetryDelayRange;

  txnClient.transactionMode = isolationMode;

  try {
    for (let attempt = 1; ; attempt++) {
      try {
        if (attempt > 1) console.log(`Retrying transaction #${txnId}, attempt ${attempt} of ${maxAttempts}`)

        await sql`START TRANSACTION ISOLATION LEVEL ${raw(isolationMode)}`.run(txnClient);
        const result = await callback(txnClient);
        await sql`COMMIT`.run(txnClient);
        return result;

      } catch (err) {
        await sql`ROLLBACK`.run(txnClient);

        // on trapping the following two rollback error codes, see:
        // https://www.postgresql.org/message-id/1368066680.60649.YahooMailNeo@web162902.mail.bf1.yahoo.com
        // this is also a good read:
        // https://www.enterprisedb.com/blog/serializable-postgresql-11-and-beyond
        if (isDatabaseError(err,
          "TransactionRollback_SerializationFailure", "TransactionRollback_DeadlockDetected")) {
          
          if (attempt < maxAttempts) {
            const delayBeforeRetry = Math.round(delayMin + (delayMax - delayMin) * Math.random());
            console.log(`Transaction #${txnId} rollback (code ${err.code}) on attempt ${attempt} of ${maxAttempts}, retrying in ${delayBeforeRetry}ms`);

            await wait(delayBeforeRetry);

          } else {
            console.log(`Transaction #${txnId} rollback (code ${err.code}) on attempt ${attempt} of ${maxAttempts}, giving up`);

            throw err;
          }

        } else {
          throw err;
        }
      }
    }
  } finally {
    (txnClient as any).transactionMode = undefined;
    txnClient.release();
  }
}

// === SQL tagged template strings ===

interface SQLResultType {
  text: string;
  values: any[];
};

export function sql<T = SQL, RunResult = pg.QueryResult['rows']>(literals: TemplateStringsArray, ...expressions: T[]) {
  return new SQLFragment<RunResult>(Array.prototype.slice.apply(literals), expressions);
}

export class SQLFragment<RunResult = pg.QueryResult['rows']> {
  runResultTransform: (qr: pg.QueryResult) => any = (qr) => qr.rows;  // default is to return the rows array, but some shortcut functions alter this
  parentTable?: string = undefined;  // used for nested shortcut select queries

  constructor(private literals: string[], private expressions: SQLExpression[]) { }

  async run(queryable: Queryable): Promise<RunResult> {
    const query = this.compile();
    if (config.verbose) console.log(query);
    const qr = await queryable.query(query);
    return this.runResultTransform(qr);
  }

  compile(result: SQLResultType = { text: '', values: [] }, parentTable?: string, currentColumn?: Column) {
    if (this.parentTable) parentTable = this.parentTable;

    result.text += this.literals[0];
    for (let i = 1, len = this.literals.length; i < len; i++) {
      this.compileExpression(this.expressions[i - 1], result, parentTable, currentColumn);
      result.text += this.literals[i];
    }
    return result;
  }

  compileExpression(expression: SQL, result: SQLResultType = { text: '', values: [] }, parentTable?: string, currentColumn?: Column) {
    if (this.parentTable) parentTable = this.parentTable;

    if (expression instanceof SQLFragment) {
      // another SQL fragment? recursively compile this one
      expression.compile(result, parentTable, currentColumn);

    } else if (typeof expression === 'string') {
      // if it's a string, it should be a x.Table or x.Columns type, so just needs quoting
      result.text += `"${expression}"`;

    } else if (expression instanceof DangerousRawString) {
      // Little Bobby Tables passes straight through ...
      result.text += expression.value;

    } else if (Array.isArray(expression)) {
      // an array's elements are compiled one by one -- note that an empty array can be used as a non-value
      for (let i = 0, len = expression.length; i < len; i++) this.compileExpression(expression[i], result, parentTable, currentColumn);

    } else if (expression instanceof Parameter) {
      // parameters become placeholders, and a corresponding entry in the values array
      result.values.push(expression.value);
      result.text += '$' + String(result.values.length);  // 1-based indexing

    } else if (expression === Default) {
      // a column default
      result.text += 'DEFAULT';

    } else if (expression === self) {
      // alias to the latest column, if applicable
      if (!currentColumn) throw new Error(`The 'self' column alias has no meaning here`);
      result.text += `"${currentColumn}"`;

    } else if (expression instanceof ParentColumn) {
      // alias to the parent table (plus supplied column name) of a nested query, if applicable
      if (!parentTable) throw new Error(`The 'parent' table alias has no meaning here`);
      result.text += `"${parentTable}"."${expression.value}"`;

    } else if (expression instanceof ColumnNames) {
      // a ColumnNames-wrapped object -> quoted names in a repeatable order
      // or: a ColumnNames-wrapped array
      const columnNames = Array.isArray(expression.value) ? expression.value :
        Object.keys(expression.value).sort();
      result.text += columnNames.map(k => `"${k}"`).join(', ');

    } else if (expression instanceof ColumnValues) {
      // a ColumnValues-wrapped object -> values (in above order) are punted as SQL fragments or parameters
      const
        columnNames = <Column[]>Object.keys(expression.value).sort(),
        columnValues = columnNames.map(k => (<any>expression.value)[k]);

      for (let i = 0, len = columnValues.length; i < len; i++) {
        const
          columnName = columnNames[i],
          columnValue = columnValues[i];
        if (i > 0) result.text += ', ';
        if (columnValue instanceof SQLFragment || columnValue === Default) this.compileExpression(columnValue, result, parentTable, columnName);
        else this.compileExpression(new Parameter(columnValue), result, parentTable, columnName);
      }

    } else if (typeof expression === 'object') {
      // must be a Whereable object, so put together a WHERE clause
      const columnNames = <Column[]>Object.keys(expression).sort();

      if (columnNames.length) {  // if the object is not empty
        result.text += '(';
        for (let i = 0, len = columnNames.length; i < len; i++) {
          const
            columnName = columnNames[i],
            columnValue = (<any>expression)[columnName];
          if (i > 0) result.text += ' AND ';
          if (columnValue instanceof SQLFragment) {
            result.text += '(';
            this.compileExpression(columnValue, result, parentTable, columnName);
            result.text += ')';

          } else {
            result.text += `"${columnName}" = `;
            this.compileExpression(columnValue instanceof ParentColumn ? columnValue : new Parameter(columnValue),
              result, parentTable, columnName);
          }
        }
        result.text += ')';

      } else {
        // or if it is empty, it should always match
        result.text += 'TRUE';
      }

    } else {
      throw new Error(`Alien object while interpolating SQL: ${expression}`);
    }
  }
}

// === supporting functions ===

const wait = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

const mapWithSeparator = <TIn, TSep, TOut>(
  arr: TIn[],
  separator: TSep,
  cb: (x: TIn, i: number, a: typeof arr) => TOut
): (TOut | TSep)[] => {

  const result: (TOut | TSep)[] = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    if (i > 0) result.push(separator);
    result.push(cb(arr[i], i, arr));
  }
  return result;
}

const completeKeysWithDefault = <T extends object>(objs: T[]): T[] => {
  // e.g. [{ x: 1 }, { y: 2 }] => [{ x: 1, y: Default }, { x: Default, y: 2}]
  const unionKeys = Object.assign({}, ...objs);
  for (let k in unionKeys) unionKeys[k] = Default;
  return objs.map(o => Object.assign({}, unionKeys, o));
}
