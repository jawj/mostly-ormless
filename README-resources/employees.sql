-- prettified with https://sqlfum.pt/

SELECT COALESCE(jsonb_agg(result), '[]') AS result
  FROM (
          SELECT jsonb_build_object('name', name)
                 || jsonb_build_object(
                    'lineManager',
                    "cj_lineManager".result,
                    'directReports',
                    "cj_directReports".result
                  ) AS result
            FROM employees
                 LEFT JOIN LATERAL (
                    SELECT jsonb_build_object('name', name) AS result
                      FROM employees AS managers
                     WHERE id = employees."managerId"
                     LIMIT 1
                  ) AS "cj_lineManager" ON true
                 LEFT JOIN LATERAL (
                    SELECT count(reports.*) AS result
                      FROM employees AS reports
                     WHERE "managerId" = employees.id
                  ) AS "cj_directReports" ON true
        ORDER BY name ASC
       ) AS sq_employees;
