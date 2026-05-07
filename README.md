# `getKysely({ convertValues: true })` does not apply `convertToJSValueSQL` for custom Types

Issue: https://github.com/mikro-orm/mikro-orm/issues/7679

Repro:

```bash
npm install
npm test
```

`getKysely({ convertValues: true })` runs `customType.convertToJSValue` on
the raw column, but never wraps the SELECT with
`customType.convertToJSValueSQL` the way `EntityManager` does. Columns
that need a SQL-side conversion (PostGIS `geometry`, blob columns going
through `hex()`/`unhex()`, etc.) come back garbled.
