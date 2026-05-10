# `getKysely({ convertValues: true })` — `convertToJSValueSQL` is still skipped in two scenarios on 7.0.15

Original issue: https://github.com/mikro-orm/mikro-orm/issues/7679

[mikro-orm/mikro-orm#7682](https://github.com/mikro-orm/mikro-orm/pull/7682)
landed in `7.0.15` and fixes the most common path
(`kysely.selectFrom(...).select(['col']).execute()`), but the same
bug still reproduces in two real-world scenarios.

Repro:

```bash
npm install
npm test
```

| # | Test                                                                   | Compiled SQL on 7.0.15                            | 7.0.15 result | Why                                                                                                                                                                                                            |
| - | ---------------------------------------------------------------------- | ------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `kysely.execute()`, bare column `'uuid'`                               | `select "id", hex(`uuid`) as "uuid" from "user"`  | passes        | `transformQuery` wraps with `hex(...)`, `transformResult` runs `convertToJSValue`                                                                                                                              |
| 2 | `em.execute(raw(query))`, bare column `'uuid'`                         | `select "id", hex(`uuid`) as "uuid" from "user"`  | **fails**     | `query.compile()` runs `transformQuery` so the SQL is correct, but `em.execute` hands the raw SQL to the driver — Kysely's `transformResult` is bypassed, so `convertToJSValue` never runs                     |
| 3 | `kysely.execute()`, table-qualified column with alias `'user.uuid as uuid'` | `select "user"."id" as "id", "user"."uuid" as "uuid" from "user"` | **fails**     | This is the known limitation called out in [#7682](https://github.com/mikro-orm/mikro-orm/pull/7682) — a user-supplied alias on a wrapped column makes the SQL wrap silently skipped, even when the alias name matches the field name |

Failing output:

```
× em.execute(raw(query)): bare column — wrap applied, result transform skipped
  Expected: "11111111-2222-3333-4444-555555555555"
  Received: "11111111222233334444555555555555"

× kysely.execute(): table-qualified column with user-supplied alias — wrap skipped, result transform applied
  Expected: "11111111-2222-3333-4444-555555555555"
  Received: undefined
```

Both scenarios show up together for callers using PostGIS `geometry`
columns through MikroORM + Kysely (the original report on #7679):
table-qualified selects routed through `em.execute(raw(query))` come
back as raw WKB hex strings instead of WKT, because neither
`ST_AsText(...)` is wrapped around the column nor `convertToJSValue`
parses the result.
