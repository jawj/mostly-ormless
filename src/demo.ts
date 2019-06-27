import * as db from "./db";
import * as s from "./demo-schema";

(async () => {

  await (async () => {
    // setup (uses shortcut functions)
    const allTables: s.AllTables = ["appleTransactions", "authors", "books", "emailAuthentication"];
    await db.truncate(db.pool, allTables, "CASCADE");

    await db.insert(db.pool, "authors", [
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
    ]);
    
    await db.insert(db.pool, "books", {
      authorId: 1,
      title: "Pride and Prejudice",
    });
  })();

  await (async () => {
    // simple query
    const
      authorId = 1,
      query = db.sql<s.books.SQL>`
        SELECT * FROM ${"books"} WHERE ${{ authorId }}`,
      
      existingBooks: s.books.Selectable[] = await query.run(db.pool);
  
    console.log(existingBooks);
  })();

  await (async () => {
    // Whereable with a nested SQLFragment
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
    // simple insert
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
    // inner join
    type bookAuthorSQL = s.books.SQL | s.authors.SQL | "author";
    type bookAuthorSelectable = s.books.Selectable & { author: s.authors.Selectable };

    const
      query = db.sql<bookAuthorSQL>`
        SELECT ${"books"}.*, to_jsonb(${"authors"}.*) as ${"author"}
        FROM ${"books"} JOIN ${"authors"} 
          ON ${"books"}.${"authorId"} = ${"authors"}.${"id"}`,

      bookAuthors: bookAuthorSelectable[] = await query.run(db.pool);
    
    console.log(bookAuthors);
  })();
  
  await (async () => {
    const
      authorId = 123,
      existingBooks = await db.select(db.pool, "books", { authorId });
    
    console.log(existingBooks);

    const lastButOneBook = await db.selectOne(db.pool, "books", { authorId }, {
      order: [{ by: "createdAt", direction: "DESC" }], offset: 1
    });
    
    console.log(lastButOneBook);

    const savedBooks = await db.insert(db.pool, "books", [{
      authorId: 123,
      title: "One Hundred Years of Solitude",
    }, {
      authorId: 456,
      title: "Cheerio, and Thanks for All the Fish",
    }]);
    
    console.log(savedBooks);

    const
      fishBookId = savedBooks[1].id,
      properTitle = "So Long, and Thanks for All the Fish",

      [updatedBook] = await db.update(db.pool, "books",
        { title: properTitle },
        { id: fishBookId }
      );
    
    console.log(updatedBook);
  })();

  await (async () => {
    const email = "me@privacy.net";

    await db.insert(db.pool, "emailAuthentication", { email });

    await db.update(db.pool, "emailAuthentication", {
      consecutiveFailedLogins: db.sql`${db.self} + 1`,
      lastFailedLogin: db.sql`now()`,
    }, { email });
  })();

  await (async () => {
    await db.insert(db.pool, "appleTransactions", {
      environment: 'PROD',
      originalTransactionId: '123456',
      accountId: 123,
      latestReceiptData: "5Ia+DmVgPHh8wigA",
    });

    const newTransactions: s.appleTransactions.Insertable[] = [{
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
      result = await db.upsert(db.pool, "appleTransactions", newTransactions,
        ["environment", "originalTransactionId"]);
    
    console.log(result);
  })();

  await (async () => {
    const
      email = "me@privacy.net",
      result = await db.transaction(db.Isolation.Serializable, async txnClient => {
        const emailAuth = await db.selectOne(txnClient, "emailAuthentication", { email });
        // do stuff with email record -- e.g. check a password
        return db.update(txnClient, "emailAuthentication", {
          consecutiveFailedLogins: db.sql`${db.self} + 1`,
          lastFailedLogin: db.sql`now()`,
        }, { email });
      });
    
    console.log(result);
  })();
  
  db.pool.end();
})();
