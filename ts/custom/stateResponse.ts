import { OmitArray } from "../core/core.js";
import { MessageResponse, QueryResponse, chain } from "../core/response.js";
import { setup, mode } from "../commands/shared.js";

export class StateMessageResponse<A extends any[] = [
  MessageResponse["args"][0],
  mode,
  ...OmitArray<MessageResponse["args"], 0>
]> extends MessageResponse<A> {

  constructor(...args: StateMessageResponse["args"]) {
    const [match, md, ...rest] = args;
    super(match, ...rest);
    this.check(async msg => setup.initState(msg.from?.id) != null ? chain.on : chain.escape);
    this.check(async (msg) => {
      const state = setup.getState(msg.from?.id)!.state;
      console.log(state.mode);
      if(md === mode.ANY || state.mode === md)
        return chain.on;
      return chain.escape;
    });
  }

}

export class StateQueryResponse<A extends any[] = [
  QueryResponse["args"][0],
  mode,
  ...OmitArray<QueryResponse["args"], 0>
]> extends QueryResponse<A> {

  constructor(...args: StateQueryResponse["args"]) {
    const [match, md, ...rest] = args;
    super(match, ...rest);
    this.check(async msg => setup.initState(msg.from?.id) != null ? chain.on : chain.escape);
    this.check(async (msg) => {
      const state = setup.getState(msg.from?.id)!.state;
      if(md === mode.ANY || state.mode === md)
        return chain.on;
      return chain.escape;
    });
  }

}