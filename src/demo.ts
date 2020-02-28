import * as db from "./core";
import * as s from "./schema";

(async () => {

  await (async () => {
    
    // setup (uses shortcut functions)
    const allTables: s.AllTables = ["appleTransactions", "authors", "books", "emailAuthentication", "people", "tags"];
    await db.truncate(allTables, "CASCADE").run(db.pool);

    await db.insert("authors", [
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
    ]).run(db.pool);
    
    const insertedBooks = await db.insert("books", [
      {
        authorId: 1,
        title: "Pride and Prejudice",
      }, {
        authorId: 123,
        title: "Love in the Time of Cholera"
      }
    ]).run(db.pool);

    await db.insert("tags", [
      { tag: "Spanish", bookId: insertedBooks[1].id },
      { tag: "1980s", bookId: insertedBooks[1].id },
    ]).run(db.pool);

  })();

  await (async () => {
    console.log('\n=== Simple manual SELECT ===\n');

    const
      authorId = 1,
      query = db.sql<s.books.SQL>`
        SELECT * FROM ${"books"} WHERE ${{ authorId }}`,
      existingBooks: s.books.Selectable[] = await query.run(db.pool);
  
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
      existingBooks: s.books.Selectable[] = await query.run(db.pool);
  
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
      insertedBooks: s.books.Selectable[] = await query.run(db.pool);
    
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
      bookAuthors: bookAuthorSelectable[] = await query.run(db.pool);
    
    console.log(bookAuthors);

    const q = await db.select('books', db.all, {
      columns: ['title'],
      lateral: {
        author: db.selectOne('authors', { id: db.parent('authorId') }, {
          columns: ['name', 'isLiving'],
          lateral: { booksWritten: db.count('books', { authorId: db.parent('id') }) }
        })
      }
    });
    const r = await q.run(db.pool);
    console.dir(r, { depth: null });
    console.log(r.map(b => b.author?.booksWritten));

    const one = await db.selectOne('books', db.all, { limit: 1 }).run(db.pool);
    console.log(one);
    const count = await db.count('books', db.all, { columns: ['title'] }).run(db.pool);
    console.log(count);
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
      authorBooks: authorBooksSelectable[] = await query.run(db.pool);

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
      authorBooks: authorBooksSelectable[] = await query.run(db.pool);

    console.dir(authorBooks, { depth: null });

    const q = await db.select('authors', db.all, {
      lateral: {
        books: db.select('books', { authorId: db.parent('id') })
      }
    });
    const r = await q.run(db.pool);
    console.dir(r, { depth: null });

    console.log(r[0].books[0].title);
  })();

  await (async () => {
    console.log('\n=== Two-level one-to-many join (using LATERAL) ===\n');

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
      authorBookTags: authorBookTagsSelectable[] = await query.run(db.pool);

    console.dir(authorBookTags, { depth: null });

    const abt = await db.select('authors', db.all, {
      lateral: {
        books: db.select('books', { authorId: db.parent('id') }, {
          lateral: {
            tags: db.select('tags', { bookId: db.parent('id') })
          }
        })
      }
    }).run(db.pool);

    console.dir(abt, { depth: null });
    abt.map(a => a.books.map(b => b.tags.map(t => t.tag)));

  })();

  await (async () => {
    console.log('\n=== Querying a subset of fields ===\n');

    const bookCols = <const>['id', 'title'];
    type BookDatum = s.books.OnlyCols<typeof bookCols>;

    const
      query = db.sql<s.books.SQL>`SELECT ${db.cols(bookCols)} FROM ${"books"}`,
      bookData: BookDatum[] = await query.run(db.pool);
    
    console.log(bookData);
  })();
  
  await (async () => {
    console.log('\n=== Shortcut functions ===\n');
    
    const
      authorId = 123,
      existingBooks = await db.select("books", { authorId }).run(db.pool);
    
    console.log(existingBooks);

    const allBookTitles = await db.select("books", db.all, { columns: ['title'] }).run(db.pool);

    console.log(allBookTitles);

    const lastButOneBook = await db.selectOne("books", { authorId }, {
      order: [{ by: "createdAt", direction: "DESC" }], offset: 1
    }).run(db.pool);

    console.log(lastButOneBook);

    const savedBooks = await db.insert("books",
      [{
        authorId: 123,
        title: "One Hundred Years of Solitude",
      }, {
        authorId: 456,
        title: "Cheerio, and Thanks for All the Fish",
      }]
    ).run(db.pool);
    
    console.log(savedBooks);

    const
      fishBookId = savedBooks[1].id,
      properTitle = "So Long, and Thanks for All the Fish",

      [updatedBook] = await db.update("books",
        { title: properTitle },
        { id: fishBookId }
      ).run(db.pool);
    
    console.log(updatedBook);

    const deleted = await db.deletes('books', { id: fishBookId }).run(db.pool);
    console.log(deleted);
  })();

  await (async () => {
    console.log('\n=== Shortcut UPDATE with a SQLFragment in an Updatable ===\n');

    const email = "me@privacy.net";

    await db.insert("emailAuthentication", { email }).run(db.pool);

    await db.update("emailAuthentication", {
      consecutiveFailedLogins: db.sql`${db.self} + 1`,
      lastFailedLogin: db.sql`now()`,
    }, { email }).run(db.pool);
  })();

  await (async () => {
    console.log('\n=== Shortcut UPSERT ===\n');

    await db.insert("appleTransactions", {
      environment: 'PROD',
      originalTransactionId: '123456',
      accountId: 123,
      latestReceiptData: "5Ia+DmVgPHh8wigA",
    }).run(db.pool);

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
        ["environment", "originalTransactionId"]).run(db.pool);

    console.log(result);
  })();

  await (async () => {
    console.log('\n=== Transaction ===\n');
    const
      email = "me@privacy.net",
      result = await db.transaction(db.Isolation.Serializable, async txnClient => {

        const emailAuth = await db.selectOne("emailAuthentication", { email }).run(txnClient);
        console.log(emailAuth?.consecutiveFailedLogins);

        // do stuff with email record -- e.g. check a password, handle successful login --
        // but remember everything non-DB-related in this function must be idempotent
        // since it might be called several times if there are serialization failures
        
        return db.update("emailAuthentication", {
          consecutiveFailedLogins: db.sql`${db.self} + 1`,
          lastFailedLogin: db.sql`now()`,
        }, { email }).run(txnClient);
      });
    
    console.log(result);
  })();

  await (async () => {
    console.log('\n=== Self-joins ===\n');

    const
      anna = await db.insert('people', { name: 'Anna' }).run(db.pool),
      [beth, charlie] = await db.insert('people', [
        { name: 'Beth', managerId: anna.id },
        { name: 'Charlie', managerId: anna.id },
      ]).run(db.pool),
      dougal = await db.insert('people', { name: 'Dougal', managerId: beth.id }).run(db.pool);
    
    await db.update('people', { paId: charlie.id }, { id: anna.id }).run(db.pool);
    
    const people = await db.select('people', db.all, {
      columns: ['name'],
      order: [{ by: 'name', direction: 'ASC' }],
      lateral: {
        lineManager: db.selectOne('people', { id: db.parent('managerId') }, { alias: 'managers', columns: ['name'] }),
        directReports: db.select('people', { managerId: db.parent('id') }, { alias: 'reports', columns: ['name'] }),
        pa: db.selectOne('people', { id: db.parent('paId') }, { alias: 'pas', columns: ['name'] }),
      },
    }).run(db.pool);
    
    console.dir(people, { depth: null });
  })();

  await db.pool.end();
})();
