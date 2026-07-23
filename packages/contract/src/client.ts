import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Layer } from "effect";
import { ACTOR_HEADER } from "./middleware.js";

export const layerProtocol = (options: {
	readonly url: string;
	readonly actorId?: string;
}): Layer.Layer<RpcClient.Protocol> => {
	const { actorId } = options;
	const protocol =
		actorId === undefined
			? RpcClient.layerProtocolHttp({ url: options.url })
			: RpcClient.layerProtocolHttp({
					url: options.url,
					transformClient: HttpClient.mapRequest(
						HttpClientRequest.setHeader(ACTOR_HEADER, actorId),
					),
				});

	return protocol.pipe(
		Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]),
	);
};
