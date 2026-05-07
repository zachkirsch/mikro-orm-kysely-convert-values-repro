# `getKysely({ convertValues: true })` does not apply `convertToJSValueSQL` for custom Types

Issue: mikro-orm/mikro-orm#TODO

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
