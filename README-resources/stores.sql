-- prettified with https://sqlfum.pt/

SELECT jsonb_build_object('name', name)
       || jsonb_build_object('alternatives', cj_alternatives.result) AS result
  FROM stores
       LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(result), '[]') AS result
            FROM (
                    SELECT jsonb_build_object('name', name)
                           || jsonb_build_object('distance', st_distance(geom, stores.geom)) AS result
                      FROM stores AS nearby
                     WHERE id != stores.id
                  ORDER BY geom <-> stores.geom ASC
                     LIMIT 3
                 ) AS sq_nearby
        ) AS cj_alternatives ON true
 WHERE id = $1
 LIMIT 1;
