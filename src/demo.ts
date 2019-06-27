import * as db from './db';
import * as s from './demo-schema';

(async () => {

  await (async () => {
    // setup (uses shortcut functions)
    await db.truncate(db.pool, ['books', 'authors'], 'CASCADE');
    await db.insert(db.pool, 'authors', [{
      id: 1,
      name: 'Jane Austen',
      isLiving: false,
    }, {
      id: 123,
      name: 'Gabriel Garcia Marquez',
      isLiving: false,
    }]);
    await db.insert(db.pool, 'books', {
      authorId: 1,
      title: 'Pride and Prejudice',
    });
  });

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
    
    console.log(insertedBooks)
  })();

  await (async () => {

  })();
  
  await (async () => {

  })();

  await (async () => {

  })();
  
  db.pool.end();
})();
