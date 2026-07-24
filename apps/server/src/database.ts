import { SqlClient } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Config, Context, Effect, Layer } from "effect";

export class Database extends Context.Tag("@insurance/server/Database")<
	Database,
	{ readonly ping: Effect.Effect<boolean> }
>() {}

export const PgLive = PgClient.layerConfig({
	url: Config.redacted("DATABASE_URL"),
});

export const DatabaseLive = Layer.effect(
	Database,
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		return Database.of({
			ping: sql`SELECT 1`.pipe(
				Effect.as(true),
				Effect.catchAll(() => Effect.succeed(false)),
			),
		});
	}),
);
