import * as pg from 'pg';
import { isDatabaseError } from './pgErrors';

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

const config = {  // in use, you'll probably import this from somewhere
    dbURL: 'postgresql://localhost/mostly_ormless',
    dbTransactionAttempts: 5,
    dbTransactionRetryDelayRange: [25, 125],
    verbose: true,
};
  
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


export type GenericSQLExpression = SQLFragment | Parameter | DefaultType | DangerousRawString | SelfType;
export type SQLExpression = Table | ColumnNames<Updatable | (keyof Updatable)[]> | ColumnValues<Updatable> | Whereable | Column | GenericSQLExpression;
export type SQL = SQLExpression | SQLExpression[];


export interface Runnable { run: (...args: any) => any };
export interface RunnablesMap { [k: string]: Runnable };
export type PromisedType<P> = P extends Promise<infer U> ? U : never;
export type PromisedRunnableReturnType<R extends Runnable> = PromisedType<ReturnType<R['run']>>;
export type PromisedRunnableReturnTypeMap<L extends RunnablesMap> = { [K in keyof L]: PromisedRunnableReturnType<L[K]> };


// === simple query helpers ===

export type Queryable = pg.Pool | PoolClient<any>;

export const insert: InsertSignatures = async function
  (client: Queryable, table: Table, values: Insertable | Insertable[]): Promise<any> {

  const
    completedValues = Array.isArray(values) ? completeKeysWithDefault(values) : values,
    colsSQL = cols(Array.isArray(completedValues) ? completedValues[0] : completedValues),
    valuesSQL = Array.isArray(completedValues) ?
      mapWithSeparator(completedValues as Insertable[], sql<SQL>`, `, v => sql<SQL>`(${vals(v)})`) :
      sql<SQL>`(${vals(completedValues)})`,
    query = sql<SQL>`INSERT INTO ${table} (${colsSQL}) VALUES ${valuesSQL} RETURNING *`,
    rows = await query.run(client);

  return Array.isArray(completedValues) ? rows : rows[0];
}


export interface UpsertAction { $action: 'INSERT' | 'UPDATE' };

export const upsert: UpsertSignatures = async function
  (client: Queryable, table: Table, values: Insertable | Insertable[], uniqueCols: Column | Column[], noNullUpdateCols: Column | Column[] = []): Promise<any> {

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

  // console.log(query.compile());
  const rows = await query.run(client);

  return Array.isArray(completedValues) ? rows : rows[0];
}

export const update: UpdateSignatures = async function
  (client: Queryable, table: Table, values: Updatable, where: Whereable): Promise<any[]> {

  // note: the ROW() constructor below is required in Postgres 10+ if we're updating a single column
  // more info: https://www.postgresql-archive.org/Possible-regression-in-UPDATE-SET-lt-column-list-gt-lt-row-expression-gt-with-just-one-single-column0-td5989074.html
  const
    query = sql<SQL>`UPDATE ${table} SET (${cols(values)}) = ROW(${vals(values)}) WHERE ${where} RETURNING *`,
    rows = await query.run(client);

  return rows;
}

// the 'where' argument is not optional on delete because (a) you don't want to wipe your table 
// by forgetting it, and (b) if you do want to wipe your table, maybe use truncate?
export const deletes: DeleteSignatures = async function  // sadly, delete is a reserved word
  (client: Queryable, table: Table, where: Whereable): Promise<any[]> {

  const
    query = sql<SQL>`DELETE FROM ${table} WHERE ${where} RETURNING *`,
    rows = await query.run(client);

  return rows;
}

type TruncateIdentityOpts = 'CONTINUE IDENTITY' | 'RESTART IDENTITY';
type TruncateForeignKeyOpts = 'RESTRICT' | 'CASCADE';

interface TruncateSignatures {
  (client: Queryable, table: Table | Table[], optId: TruncateIdentityOpts): Promise<void>;
  (client: Queryable, table: Table | Table[], optFK: TruncateForeignKeyOpts): Promise<void>;
  (client: Queryable, table: Table | Table[], optId: TruncateIdentityOpts, optFK: TruncateForeignKeyOpts): Promise<void>;
}

export const truncate: TruncateSignatures = async function
  (client: Queryable, table: Table | Table[], ...opts: string[]): Promise<void> {

  if (!Array.isArray(table)) table = [table];

  const
    tables = mapWithSeparator(table, sql`, `, t => t),
    query = sql<SQL>`TRUNCATE ${tables}${raw((opts.length ? ' ' : '') + opts.join(' '))}`;

  await query.run(client);
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
  lateral?: { [k: string]: ReturnType<typeof select>; }; // | ReturnType<typeof selectOne> },
  // count?: boolean,  // for use by count
  // one?: boolean,  // for use by selectOne
}

export const select: SelectSignatures = function (
  table: Table,
  where: Whereable | SQLFragment | AllType = all,
  rawOptions: SelectOptions = {},
  mode: SelectResultMode = SelectResultMode.Many,
) {
  
  const
    options = SelectResultMode.One ? Object.assign({}, rawOptions, { limit: 1 }) : rawOptions,
    colsSQL = mode === SelectResultMode.Count ?
      (options.columns ? sql`count(${cols(options.columns)})` : sql`count(${table}.*)`) :
      options.columns ?
        sql`jsonb_build_object(${mapWithSeparator(options.columns, sql`, `, c => raw(`'${c}', "${table}"."${c}"`))})` :
        sql`to_jsonb(${table}.*)`,
    colsLateralSQL = options.lateral === undefined ? [] :
      sql` || jsonb_build_object(${mapWithSeparator(
        Object.keys(options.lateral), sql`, `, k => raw(`'${k}', "cj_${k}".result`))})`,
    allColsSQL = sql`${colsSQL}${colsLateralSQL}`,
    aggColsSQL = mode === SelectResultMode.Many ? sql`coalesce(jsonb_agg(${allColsSQL}), '[]')` : allColsSQL,
    whereSQL = where === all ? [] : [sql` WHERE `, where],
    orderSQL = !options.order ? [] :
      [sql` ORDER BY `, ...mapWithSeparator(options.order, sql`, `, o =>
        sql`${o.by} ${raw(o.direction)}${o.nulls ? sql` NULLS ${raw(o.nulls)}` : []}`)],
    limitSQL = options.limit === undefined ? [] : sql` LIMIT ${raw(String(options.limit))}`,
    offsetSQL = options.offset === undefined ? [] : sql` OFFSET ${raw(String(options.offset))}`,
    lateralSQL = options.lateral === undefined ? [] : Object.keys(options.lateral).map(k => {
      const
        subName = raw(`"cj_${k}"`),  // may need a suffix counter to distinguish depth?
        subQ = options.lateral![k];
      return sql` CROSS JOIN LATERAL (${subQ}) ${subName}`;
    });

  const query = sql<SQL>`SELECT ${aggColsSQL} AS result FROM ${table}${lateralSQL}${whereSQL}${orderSQL}${limitSQL}${offsetSQL}`;
  query.transformRunResult = (qr) => qr.rows[0].result;

  return query;
}

// you might argue that 'selectOne' offers little that you can't get with destructuring assignment 
// and plain 'select' -- i.e. let[x] = select(...) -- but a thing that is definitely worth having 
// is '| undefined' in the return signature, because the result of indexing never includes undefined
// (see e.g. https://github.com/Microsoft/TypeScript/issues/13778)
export const selectOne: SelectOneSignatures = function (
  table: Table,
  where: Whereable | SQLFragment | AllType = all,
  options: SelectOptions = {},
) {
  return select(<any>table, <any>where, <any>options, SelectResultMode.One);
}

export const count: CountSignatures = function (
  table: Table,
  where: Whereable | SQLFragment | AllType = all,
) {
  return select(<any>table, <any>where, {}, SelectResultMode.Count);
}


// === transactions support ===

// these are the only meaningful values in Postgres: 
// see https://www.postgresql.org/docs/11/sql-set-transaction.html
export enum Isolation {
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

export function sql<T = SQL>(literals: TemplateStringsArray, ...expressions: T[]) {
  return new SQLFragment(Array.prototype.slice.apply(literals), expressions);
}

export class SQLFragment<RunResult extends any = any[]> {

  constructor(private literals: string[], private expressions: SQLExpression[]) { }

  transformRunResult: (qr: pg.QueryResult) => any = (qr) => qr.rows;  // default is to return array of rows

  async run(queryable: Queryable): Promise<RunResult> {
    const query = this.compile();
    if (config.verbose) console.log(query);
    const qr = await queryable.query(query);
    return this.transformRunResult(qr);
  }

  compile(result: SQLResultType = { text: '', values: [] }, currentAlias?: string) {
    result.text += this.literals[0];
    for (let i = 1, len = this.literals.length; i < len; i++) {
      this.compileExpression(this.expressions[i - 1], result, currentAlias);
      result.text += this.literals[i];
    }
    return result;
  }

  compileExpression(expression: SQL, result: SQLResultType = { text: '', values: [] }, currentAlias?: string) {

    if (expression instanceof SQLFragment) {
      // another SQL fragment? recursively compile this one
      expression.compile(result, currentAlias);

    } else if (typeof expression === 'string') {
      // if it's a string, it should be a x.Table or x.Columns type, so just needs quoting
      result.text += `"${expression}"`;

    } else if (expression instanceof DangerousRawString) {
      // Little Bobby Tables passes straight through ...
      result.text += expression.value;

    } else if (Array.isArray(expression)) {
      // an array's elements are compiled one by one
      for (let i = 0, len = expression.length; i < len; i++) this.compileExpression(expression[i], result, currentAlias);

    } else if (expression instanceof Parameter) {
      // parameters become placeholders, and a corresponding entry in the values array
      result.values.push(expression.value);
      result.text += '$' + String(result.values.length);  // 1-based indexing

    } else if (expression === Default) {
      // a column default
      result.text += 'DEFAULT';

    } else if (expression === self) {
      // alias to the latest column, if applicable
      if (!currentAlias) throw new Error(`The 'self' column alias has no meaning here`);
      result.text += `"${currentAlias}"`;

    } else if (expression instanceof ColumnNames) {
      // a ColumnNames-wrapped object -> quoted names in a repeatable order
      // or: a ColumnNames-wrapped array
      const columnNames = Array.isArray(expression.value) ? expression.value :
        Object.keys(expression.value).sort();
      result.text += columnNames.map(k => `"${k}"`).join(', ');

    } else if (expression instanceof ColumnValues) {
      // a ColumnValues-wrapped object -> values (in above order) are punted as SQL fragments or parameters
      const
        columnNames = Object.keys(expression.value).sort(),
        columnValues = columnNames.map(k => (<any>expression.value)[k]);

      for (let i = 0, len = columnValues.length; i < len; i++) {
        const
          columnName = columnNames[i],
          columnValue = columnValues[i];
        if (i > 0) result.text += ', ';
        if (columnValue instanceof SQLFragment || columnValue === Default) this.compileExpression(columnValue, result, columnName);
        else this.compileExpression(new Parameter(columnValue), result, columnName);
      }

    } else if (typeof expression === 'object') {
      // must be a Whereable object, so put together a WHERE clause
      const columnNames = Object.keys(expression).sort();

      if (columnNames.length) {
        // if the object is not empty
        result.text += '(';
        for (let i = 0, len = columnNames.length; i < len; i++) {
          const
            columnName = columnNames[i],
            columnValue = (<any>expression)[columnName];
          if (i > 0) result.text += ' AND ';
          if (columnValue instanceof SQLFragment) {
            result.text += '(';
            this.compileExpression(columnValue, result, columnName);
            result.text += ')';
          } else {
            result.text += `"${columnName}" = `;
            this.compileExpression(new Parameter(columnValue), result, columnName);
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
