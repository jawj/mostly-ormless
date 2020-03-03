-- prettified with https://sqlfum.pt/

SELECT COALESCE(jsonb_agg(result), '[]') AS result
  FROM (
        SELECT to_jsonb(authors.*) || jsonb_build_object('books', cj_books.result) AS result
          FROM authors
               LEFT JOIN LATERAL (
                  SELECT COALESCE(jsonb_agg(result), '[]') AS result
                    FROM (
                          SELECT to_jsonb(books.*)
                                 || jsonb_build_object('tags', cj_tags.result) AS result
                            FROM books
                                 LEFT JOIN LATERAL (
                                    SELECT COALESCE(jsonb_agg(result), '[]') AS result
                                      FROM (
                                            SELECT to_jsonb(tags.*) AS result
                                              FROM tags
                                             WHERE "bookId" = books.id
                                           ) AS sq_tags
                                  ) AS cj_tags ON true
                           WHERE "authorId" = authors.id
                         ) AS sq_books
                ) AS cj_books ON true
       ) AS sq_authors;
