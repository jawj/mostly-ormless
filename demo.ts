import * as pg from 'pg';

import * as db from "../src";
import * as s from "./schema";

db.setConfig({ verbose: true });
const pool = new pg.Pool({ connectionString: 'postgresql://localhost/mostly_ormless' });

(async () => {

  await (async () => {
    
    // setup (uses shortcut functions)
    const allTables: s.AllTables = ["appleTransactions", "authors", "books", "emailAuthentication", "employees", "stores", "tags"];
    await db.truncate(allTables, "CASCADE").run(pool);

    const insertedAuthors = await db.insert("authors", [
      {
        id: 1,
        name: "Jane Austen",
        isLiving: false,
      }, {
        id: 123,
        name: "Gabriel Garcia Marquez",
        isLiving: false,
      }, {
        id: 456,
        name: "Douglas Adams",
        isLiving: false,
      }
    ]).run(pool);

    console.log(insertedAuthors);
    
    const insertedBooks = await db.insert("books", [
      {
        authorId: 1,
        title: "Pride and Prejudice",
      }, {
        authorId: 123,
        title: "Love in the Time of Cholera"
      }
    ]).run(pool);

    console.log(insertedBooks);

    const insertedTags = await db.insert("tags", [
      { tag: "Romance", bookId: insertedBooks[0].id },
      { tag: "19th century", bookId: insertedBooks[0].id },
      { tag: "Lovesickness", bookId: insertedBooks[1].id },
      { tag: "1980s", bookId: insertedBooks[1].id },
    ]).run(pool);

    console.log(insertedTags);
  })();

  await (async () => {
    console.log('\n=== Simple manual SELECT ===\n');

    const
      authorId = 1,
      query = db.sql<s.books.SQL>`
        SELECT * FROM ${"books"} WHERE ${{ authorId }}`,
      existingBooks: s.books.Selectable[] = await query.run(pool);
  
    console.log(existingBooks);
  })();

  await (async () => {
    console.log('\n=== SELECT with a SQLFragment in a Whereable ===\n');
    
    const
      authorId = 1,
      days = 7,
      query = db.sql<s.books.SQL>`
        SELECT * FROM ${"books"} 
        WHERE ${{
          authorId,
          createdAt: db.sql<s.books.SQL>`
            ${db.self} > now() - ${db.param(days)} * INTERVAL '1 DAY'`,
        }}`,
      existingBooks: s.books.Selectable[] = await query.run(pool);
  
    console.log(existingBooks);
  })();

  await (async () => {
    console.log('\n=== Simple manual INSERT ===\n');

    const
      newBook: s.books.Insertable = {
        authorId: 123,
        title: "One Hundred Years of Solitude",
      },
      query = db.sql<s.books.SQL>`
        INSERT INTO ${"books"} (${db.cols(newBook)})
        VALUES (${db.vals(newBook)})`,
      insertedBooks: s.books.Selectable[] = await query.run(pool);
    
    console.log(insertedBooks);
  })();

  await (async () => {
    console.log('\n=== Many-to-one join (each book with its one author) ===\n');

    type bookAuthorSQL = s.books.SQL | s.authors.SQL | "author";
    type bookAuthorSelectable = s.books.Selectable & { author: s.authors.Selectable };

    const
      query = db.sql<bookAuthorSQL>`
        SELECT ${"books"}.*, to_jsonb(${"authors"}.*) as ${"author"}
        FROM ${"books"} JOIN ${"authors"} 
          ON ${"books"}.${"authorId"} = ${"authors"}.${"id"}`,
      bookAuthors: bookAuthorSelectable[] = await query.run(pool);
    
    console.log(bookAuthors);
  })();

  await (async () => {
    console.log('\n=== One-to-many join (each author with their many books) ===\n');

    // selecting all fields is, logically enough, permitted when grouping by primary key;
    // see: https://www.postgresql.org/docs/current/sql-select.html#SQL-GROUPBY and
    // https://dba.stackexchange.com/questions/158015/why-can-i-select-all-fields-when-grouping-by-primary-key-but-not-when-grouping-b

    type authorBooksSQL = s.authors.SQL | s.books.SQL;
    type authorBooksSelectable = s.authors.Selectable & { books: s.books.Selectable[] };

    const
      query = db.sql<authorBooksSQL>`
        SELECT ${"authors"}.*, coalesce(json_agg(${"books"}.*) filter (where ${"books"}.* is not null), '[]') AS ${"books"}
        FROM ${"authors"} LEFT JOIN ${"books"} 
          ON ${"authors"}.${"id"} = ${"books"}.${"authorId"}
        GROUP BY ${"authors"}.${"id"}`,
      authorBooks: authorBooksSelectable[] = await query.run(pool);

    console.dir(authorBooks, { depth: null });
  })();

  await (async () => {
    console.log('\n=== Alternative one-to-many join (using LATERAL) ===\n');

    type authorBooksSQL = s.authors.SQL | s.books.SQL;
    type authorBooksSelectable = s.authors.Selectable & { books: s.books.Selectable[] };

    // note: for consistency, and to keep JSON ops in the DB, we could instead write:
    // SELECT coalesce(jsonb_agg(to_jsonb("authors".*) || to_jsonb(bq.*)), '[]') FROM ...
    
    const
      query = db.sql<authorBooksSQL>`
        SELECT ${"authors"}.*, bq.* 
        FROM ${"authors"} CROSS JOIN LATERAL (
          SELECT coalesce(json_agg(${"books"}.*), '[]') AS ${"books"}
          FROM ${"books"}
          WHERE ${"books"}.${"authorId"} = ${"authors"}.${"id"}
        ) bq`,
      authorBooks: authorBooksSelectable[] = await query.run(pool);

    console.dir(authorBooks, { depth: null });
  })();

  await (async () => {
    console.log('\n=== Multi-level one-to-many join (using LATERAL) ===\n');

    type authorBookTagsSQL = s.authors.SQL | s.books.SQL | s.tags.SQL;
    type authorBookTagsSelectable = s.authors.Selectable & {
      books: (s.books.Selectable & { tags: s.tags.Selectable['tag'] })[]
    };

    const
      query = db.sql<authorBookTagsSQL>`
        SELECT ${"authors"}.*, bq.*
        FROM ${"authors"} CROSS JOIN LATERAL (
          SELECT coalesce(jsonb_agg(to_jsonb(${"books"}.*) || to_jsonb(tq.*)), '[]') AS ${"books"}
          FROM ${"books"} CROSS JOIN LATERAL (
            SELECT coalesce(jsonb_agg(${"tags"}.${"tag"}), '[]') AS ${"tags"} 
            FROM ${"tags"}
            WHERE ${"tags"}.${"bookId"} = ${"books"}.${"id"}
          ) tq
          WHERE ${"books"}.${"authorId"} = ${"authors"}.${"id"}
        ) bq`,
      authorBookTags: authorBookTagsSelectable[] = await query.run(pool);

    console.dir(authorBookTags, { depth: null });
  })();

  await (async () => {
    console.log('\n=== Querying a subset of fields ===\n');

    const bookCols = <const>['id', 'title'];
    type BookDatum = s.books.OnlyCols<typeof bookCols>;

    const
      query = db.sql<s.books.SQL>`SELECT ${db.cols(bookCols)} FROM ${"books"}`,
      bookData: BookDatum[] = await query.run(pool);
    
    console.log(bookData);
  })();
  
  await (async () => {
    console.log('\n=== Shortcut functions ===\n');
    
    const
      authorId = 123,
      existingBooks = await db.select("books", { authorId }).run(pool);
    
    console.log(existingBooks);

    const allBookTitles = await db.select("books", db.all, { columns: ['title'] }).run(pool);

    console.log(allBookTitles);

    const lastButOneBook = await db.selectOne("books", { authorId }, {
      order: [{ by: "createdAt", direction: "DESC" }], offset: 1
    }).run(pool);

    console.log(lastButOneBook);

    const numberOfBooks = await db.count("books", db.all).run(pool);

    console.log(numberOfBooks);

    const noBooksAtAll = await db.select("books", { authorId: -1 }).run(pool);

    console.log(noBooksAtAll);

    const noBookAtAll = await db.selectOne("books", { authorId: -1 }).run(pool);
    console.log(noBookAtAll);

    const zeroBookCount = await db.count("books", { authorId: -1 }).run(pool);
    console.log(zeroBookCount);

    const savedBooks = await db.insert("books",
      [{
        authorId: 123,
        title: "News of a Kidnapping",
      }, {
        authorId: 456,
        title: "Cheerio, and Thanks for All the Fish",
      }]
    ).run(pool);
    
    console.log(savedBooks);

    const
      fishBookId = savedBooks[1].id,
      properTitle = "So Long, and Thanks for All the Fish",

      [updatedBook] = await db.update("books",
        { title: properTitle },
        { id: fishBookId }
      ).run(pool);
    
    console.log(updatedBook);

    const deleted = await db.deletes('books', { id: fishBookId }).run(pool);
    console.log(deleted);
  })();

  await (async () => {
    console.log('\n=== Shortcut UPDATE with a SQLFragment in an Updatable ===\n');

    const
      email = "me@privacy.net",
      insertedEmail = await db.insert("emailAuthentication", { email }).run(pool),
      updatedEmail = await db.update("emailAuthentication", {
        consecutiveFailedLogins: db.sql`${db.self} + 1`,
        lastFailedLogin: db.sql`now()`,
      }, { email }).run(pool);
    
    console.log(insertedEmail, updatedEmail);
  })();

  await (async () => {
    console.log('\n=== Shortcut UPSERT ===\n');

    await db.insert("appleTransactions", {
      environment: 'PROD',
      originalTransactionId: '123456',
      accountId: 123,
      latestReceiptData: "5Ia+DmVgPHh8wigA",
    }).run(pool);

    const
      newTransactions: s.appleTransactions.Insertable[] = [{
        environment: 'PROD',
        originalTransactionId: '123456',
        accountId: 123,
        latestReceiptData: "TWFuIGlzIGRpc3Rp",
      }, {
        environment: 'PROD',
        originalTransactionId: '234567',
        accountId: 234,
        latestReceiptData: "bmd1aXNoZWQsIG5v",
      }],
      result = await db.upsert("appleTransactions", newTransactions,
        ["environment", "originalTransactionId"]).run(pool);

    console.log(result);
  })();

  await (async () => {
    console.log('\n=== Shortcut one-to-many join ===\n');
    
    const q = await db.select('authors', db.all, {
      lateral: { books: db.select('books', { authorId: db.parent('id') }) }
    });
    const r = await q.run(pool);
    console.dir(r, { depth: null });
  })();

  await (async () => {
    console.log('\n=== Shortcut multi-level one-to-many join ===\n');
    
    const authorsBooksTags = await db.select('authors', db.all, {
      lateral: {
        books: db.select('books', { authorId: db.parent('id') }, {
          lateral: {
            tags: db.select('tags', { bookId: db.parent('id') })
          }
        })
      }
    }).run(pool);

    console.dir(authorsBooksTags, { depth: null });
    // authorsBooksTags.map(a => a.books.map(b => b.tags.map(t => t.tag)));
  })();

  await (async () => {
    console.log('\n=== Shortcut self-joins requiring aliases ===\n');

    const
      anna = await db.insert('employees', { name: 'Anna' }).run(pool),
      [beth, charlie] = await db.insert('employees', [
        { name: 'Beth', managerId: anna.id },
        { name: 'Charlie', managerId: anna.id },
      ]).run(pool),
      dougal = await db.insert('employees', { name: 'Dougal', managerId: beth.id }).run(pool);

    const people = await db.select('employees', db.all, {
      columns: ['name'],
      order: [{ by: 'name', direction: 'ASC' }],
      lateral: {
        lineManager: db.selectOne('employees', { id: db.parent('managerId') },
          { alias: 'managers', columns: ['name'] }),
        directReports: db.count('employees', { managerId: db.parent('id') },
          { alias: 'reports' }),
      },
    }).run(pool);

    console.dir(people, { depth: null });
  })();

  await (async () => {
    console.log('\n=== Shortcut joins beyond foreign keys ===\n');

    const OSGB36Point = (mEast: number, mNorth: number) =>
      db.sql`ST_SetSRID(ST_Point(${db.param(mEast)}, ${db.param(mNorth)}), 27700)`;

    const [brighton] = await db.insert('stores', [
      { name: 'Brighton', geom: OSGB36Point(530587, 104192) },
      { name: 'London', geom: OSGB36Point(534927, 179382) },
      { name: 'Edinburgh', geom: OSGB36Point(323427, 676132) },
      { name: 'Newcastle', geom: OSGB36Point(421427, 563132) },
      { name: 'Exeter', geom: OSGB36Point(288427, 92132) },
    ]).run(pool);

    const localStore = await db.selectOne('stores', { id: brighton.id }, {
      columns: ['name'],
      lateral: {
        alternatives: db.select('stores', db.sql<s.stores.SQL>`${"id"} <> ${db.parent("id")}`, {
          alias: 'nearby',
          order: [{ by: db.sql<s.stores.SQL>`${"geom"} <-> ${db.parent("geom")}`, direction: 'ASC' }],
          limit: 3,
          columns: ['name'],
          extras: {
            distance: db.sql<s.stores.SQL, number>`ST_Distance(${"geom"}, ${db.parent("geom")})`
          },
        })
      }
    }).run(pool);

    console.log(localStore);
  })();


  await (async () => {
    console.log('\n=== Joins with nothing returned ===\n');

    const authorWithNoBooks = await db.selectOne('authors', db.all, {
      lateral: { bearBooks: db.select('books', { authorId: db.parent('id'), title: db.sql`${db.self} LIKE '%bear%'` }) }
    }).run(pool);

    console.log(authorWithNoBooks);

    const authorWithZeroCountBooks = await db.selectOne('authors', db.all, {
      lateral: { bearBooks: db.count('books', { authorId: db.parent('id'), title: db.sql`${db.self} LIKE '%bear%'` }) }
    }).run(pool);

    console.log(authorWithZeroCountBooks);

    const bookWithNoAuthor = await db.selectOne('books', db.all, { lateral: { author: db.selectOne('authors', { id: -1 }) } }).run(pool);

    console.log(bookWithNoAuthor);
  })();

  await (async () => {
    console.log('\n=== Date complications ===\n');

    const
      oneBooks: s.books.Selectable[] =
        await db.sql<s.books.SQL>`SELECT * FROM ${"books"} LIMIT 1`.run(pool),
      oneBook = oneBooks[0],
      someActualDate = oneBook.createdAt;

    console.log(someActualDate.constructor, someActualDate);

    const
      book = await db.selectOne('books', db.all, { columns: ['createdAt'] }).run(pool),
      someSoCalledDate = book!.createdAt,
      someConvertedDate = new Date(someSoCalledDate);

    console.log(someSoCalledDate.constructor, someSoCalledDate, someConvertedDate);

    // this fails to find anything, because JS date conversion truncates μs to ms
    const bookDatedByDate = await db.selectOne('books', { createdAt: someActualDate }).run(pool);
    console.log(bookDatedByDate);

    // therefore this also fails
    const bookDatedByConvertedDate = await db.selectOne('books', { createdAt: someConvertedDate }).run(pool);
    console.log(bookDatedByConvertedDate);

    // but this works
    const bookDatedByTruncDate = await db.selectOne('books', { createdAt: db.sql<db.SQL>`date_trunc('milliseconds', ${db.self}) = ${db.param(someActualDate)}` }).run(pool);
    console.log(bookDatedByTruncDate);

    // and this also works, more sanely
    const bookDatedByString = await db.selectOne('books', { createdAt: someSoCalledDate }).run(pool);
    console.log(bookDatedByString);
  })();

  await (async () => {
    console.log('\n=== Transaction ===\n');
    const
      email = "me@privacy.net",
      result = await db.transaction(pool, db.Isolation.Serializable, async txnClient => {

        const emailAuth = await db.selectOne("emailAuthentication", { email }).run(txnClient);
        
        console.log(emailAuth);

        // do stuff with email record -- e.g. check a password, handle successful login --
        // but remember everything non-DB-related in this function must be idempotent
        // since it might be called several times in case of serialization failures
        
        return db.update("emailAuthentication", {
          consecutiveFailedLogins: db.sql`${db.self} + 1`,
          lastFailedLogin: db.sql`now()`,
        }, { email }).run(txnClient);
      });
    
    console.log(result);
  })();

  await pool.end();
})();
