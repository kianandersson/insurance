import { RpcMiddleware } from "@effect/rpc";
import { CurrentActor } from "@insurance/actor";

export class ActorMiddleware extends RpcMiddleware.Tag<ActorMiddleware>()(
	"@insurance/contract/ActorMiddleware",
	{
		provides: CurrentActor,
	},
) {}

export const ACTOR_HEADER = "x-actor-id";
