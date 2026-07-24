import { RpcMiddleware } from "@effect/rpc";
import { Schema } from "effect";
import { CurrentActor } from "./actor.js";

export class ActorUnresolved extends Schema.TaggedError<ActorUnresolved>()(
	"ActorUnresolved",
	{},
) {}

export class ActorMiddleware extends RpcMiddleware.Tag<ActorMiddleware>()(
	"@insurance/seam/ActorMiddleware",
	{
		provides: CurrentActor,
		failure: ActorUnresolved,
	},
) {}

export const ACTOR_HEADER = "x-actor-id";
