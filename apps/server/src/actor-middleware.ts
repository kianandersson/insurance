import { Headers } from "@effect/platform";
import { User } from "@insurance/events";
import {
	ACTOR_HEADER,
	ActorMiddleware,
	ActorUnresolved,
} from "@insurance/seam";
import { Effect, Layer, Option } from "effect";

// Stub edge resolver — real auth (issue #21) replaces the source (this header),
// not the CurrentActor contract that modules depend on.
export const ActorMiddlewareStub = Layer.succeed(
	ActorMiddleware,
	ActorMiddleware.of(({ headers }) =>
		Option.match(Headers.get(headers, ACTOR_HEADER), {
			onNone: () => Effect.fail(new ActorUnresolved()),
			onSome: (id) =>
				id.trim() === ""
					? Effect.fail(new ActorUnresolved())
					: Effect.succeed(User.make({ id })),
		}),
	),
);
