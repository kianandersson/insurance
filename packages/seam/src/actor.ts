import type { User } from "@insurance/events";
import { Context } from "effect";

export class CurrentActor extends Context.Tag("@insurance/seam/CurrentActor")<
	CurrentActor,
	User
>() {}
