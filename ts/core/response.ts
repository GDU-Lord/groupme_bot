import TelegramBot from "node-telegram-bot-api";
import Option from "./options/option.js";
import { ExtendedQuery, Listener, ListenerConstructor, MessageListener, QueryListener } from "./listener.js";
import BotSetup from "./botSetup.js";
import { args, getThreadId } from "./utils.js";
import { OmitArray } from "./core.js";
import MessageEmitter from "./message.js";

export enum responseTarget {
  PRIVATE = "PRIVATE",
  COMMUNITY = "COMMUNITY",
  LOCAL = "LOCAL",
  REPLY = "REPLY",
};

export enum chain {
  on = "ON",
  escape = "ESCAPE",
  break = "BREAK"
}

export type CallbackWithPriority<L extends Listener = any> = [
  ((...args: args<L>) => Promise<chain>),
  string, // for debugging
];

export class Response<
  L extends Listener = any, 
  A = [
    BotSetup, 
    ListenerConstructor<L>,
    MessageEmitter<any, L>,
    number?
  ], D = any> {

  readonly options: Option[] = [];

  listener!: L;

  checks: CallbackWithPriority<L>[] = [];
  steps: CallbackWithPriority<L>[] = [];

  data: {
    [key: string]: D;
  } = {};

  check(callback: (...args: args<L>) => Promise<chain>, marker = "NONE"): this {
    this.checks.push([callback.bind(this), marker]);
    return this;
  }

  next(callback: (...args: args<L>) => Promise<chain>, marker = "NONE"): this {
    this.steps.push([callback.bind(this), marker]);
    return this;
  }

  declare args: A;

  onInit (): void {};

  constructor(
    public setup: BotSetup,
    public event: ListenerConstructor<L>,
    public emitter: MessageEmitter<any, L>,
    public priority: number = 0
  ) {}

  async callback(...args: args<L>): Promise<boolean> {
    for(const [c] of this.checks) {
      const r = await c(...args);
      if(r === chain.escape)
        return true;
      if(r === chain.break)
          console.log("B2");
      if(r === chain.break)
        return false;
    }
    for(const [c] of this.steps) {
      const r = await c(...args);
      if(r === chain.escape)
        return true;
      if(r === chain.break)
        console.log("B1");
      if(r === chain.break) 
        return false;
    }
    return true;
  }

  init(): this {
    this.listener = new this.event(this.setup, this.callback.bind(this), this.priority);
    this.onInit();
    return this;
  }

  useData(id: string | number | Symbol) {
    this.data[id.toString()] = this.data[id.toString()] ?? {} as D;
    return this.data[id.toString()];
  }

}

export class QueryResponse<A extends any[] = [
  (data: ExtendedQuery<any>["data"]) => Promise<boolean>, 
  ...OmitArray<Response["args"], 1>
]> extends Response<
  QueryListener,
  A,
  {
    emitted: TelegramBot.Message
  }
> {

  dataMatch: this["args"][0];

  constructor(...args: QueryResponse["args"]) {

    const [dataMatch, ...rest] = args;

    super(rest[0], QueryListener, rest[1]);

    this.dataMatch = dataMatch;

    this.check(async (query) => {
      if(await dataMatch(query.data))
        return chain.on;
      return chain.escape;
    });
    this.next(async (query) => {
      const data = this.useData(query.id);
      data.emitted = await this.emitter.emit(query.message!.chat.id, query.from.id, getThreadId(query.message!), 0, query);
      return chain.on;
    });

  }
}

export class MessageResponse<A extends any[] = [
  RegExp | string,
  ...OmitArray<Response["args"], 1>
]> extends Response<
  MessageListener, 
  A,
  {
    emitted: TelegramBot.Message
  }
> {

  match: this["args"][0];

  constructor(...args: MessageResponse["args"]) {

    const [match, ...rest] = args;

    super(rest[0], MessageListener, rest[1]);

    this.match = match;

    this.check(async (msg, meta) => {
      if(this.match === "" || msg.text?.match(this.match) != null)
        return chain.on;
      return chain.escape;
    });

    this.next(async (msg, meta) => {
      const data = this.useData(msg.message_id);
      data.emitted = await this.emitter.emit(msg.chat.id, msg.from?.id ?? 0, getThreadId(msg), msg.message_id, msg, meta);
      return chain.on;
    });

  }

}