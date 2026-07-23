import { Headers } from "@effect/platform";
import { Seller } from "@insurance/actor";
import { ACTOR_HEADER, ActorMiddleware } from "@insurance/contract";
import { Effect, Layer, Option } from "effect";

export const ActorMiddlewareLive = Layer.succeed(
	ActorMiddleware,
	ActorMiddleware.of(({ headers }) =>
		Effect.succeed(
			Option.match(Headers.get(headers, ACTOR_HEADER), {
				onNone: () => Seller.make({ id: "stub-seller" }),
				onSome: (id) => Seller.make({ id }),
			}),
		),
	),
);
