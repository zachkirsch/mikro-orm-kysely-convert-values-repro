import "reflect-metadata";
import {
  Entity,
  PrimaryKey,
  Property,
  ReflectMetadataProvider,
} from "@mikro-orm/decorators/legacy";
import { MikroORM, raw, Type } from "@mikro-orm/sqlite";
import type { InferResult } from "kysely";

class UuidBlobType extends Type<string | undefined, string | undefined> {
  convertToDatabaseValue(value: string | undefined): string | undefined {
    return value?.replace(/-/g, "");
  }

  convertToJSValue(value: unknown): string | undefined {
    if (typeof value !== "string" || !/^[0-9a-fA-F]{32}$/.test(value)) {
      return undefined;
    }
    return [
      value.slice(0, 8),
      value.slice(8, 12),
      value.slice(12, 16),
      value.slice(16, 20),
      value.slice(20, 32),
    ].join("-");
  }

  convertToDatabaseValueSQL(key: string): string {
    return `unhex(${key})`;
  }

  convertToJSValueSQL(key: string): string {
    return `hex(${key})`;
  }

  getColumnType(): string {
    return "blob";
  }
}

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property({ type: UuidBlobType })
  uuid!: string;
}

const SEED_UUID = "11111111-2222-3333-4444-555555555555";

async function setupOrm() {
  const orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [User],
    metadataProvider: ReflectMetadataProvider,
    allowGlobalContext: true,
  });
  await orm.schema.refresh();

  orm.em.create(User, { uuid: SEED_UUID });
  await orm.em.flush();
  orm.em.clear();
  return orm;
}

function getKysely(em: ReturnType<MikroORM["em"]["fork"]>) {
  return em.getKysely<{ user: { id: number; uuid: string } }>({
    convertValues: true,
    tableNamingStrategy: "table",
    columnNamingStrategy: "column",
  });
}

test("em.execute(raw(query)): bare column — wrap applied, result transform skipped", async () => {
  const orm = await setupOrm();

  const em = orm.em.fork();
  const query = getKysely(em)
    .selectFrom("user")
    .where("id", "=", 1)
    .select(["id", "uuid"]);

  const [row] = await em.execute<InferResult<typeof query>>(raw(query));
  expect(row!.uuid).toBe(SEED_UUID);

  await orm.close(true);
});

