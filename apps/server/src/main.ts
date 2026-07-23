import { NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";
import { makeServer } from "./app.js";
import { DatabaseLive, PgLive } from "./database.js";

const server = Effect.gen(function* () {
	const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000));
	return makeServer({
		port,
		database: DatabaseLive.pipe(Layer.provide(PgLive)),
	});
});

NodeRuntime.runMain(Layer.launch(Layer.unwrapEffect(server)));
