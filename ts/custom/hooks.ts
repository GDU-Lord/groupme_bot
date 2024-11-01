import TelegramBot from "node-telegram-bot-api";
import { setup, mode, hideButton } from "../commands/shared.js";
import { ExtendedQuery, MessageListener, QueryListener } from "../core/listener.js";
import { toMessage, toQuery } from "../core/core.js";
import MessageEmitter from "../core/message.js";
import { chain, responseTarget } from "../core/response.js";
import Community from "../community.js";
import { getCommunity } from "./utils.js";

export function setMode(md: mode) {
  return async function (input: TelegramBot.Message | ExtendedQuery<any>) {
    const state = setup.getState(input.from?.id)!.state;
    state.mode = md;
    return chain.on;
  };
}

export function verifyMode(md: mode, positive: chain, negative: chain) {
  return async function(input: TelegramBot.Message | ExtendedQuery<any>) {
    const state = setup.getState(input.from?.id)!.state;
    console.log(state.mode, "VERIFY MODE");
    if(md === mode.ANY || state.mode === md)
      return positive;
    return negative;
  }
}

export function verifyRole(positive: chain, negative: chain) {
  return async function(input: TelegramBot.Message) {
    if(input.from == null) return negative;
    const data = await setup.bot.getChatMember(input.chat.id, input.from.id);
    console.log(data.status, "VERIFY ROLE");
    if(data.status === "administrator" || data.status === "creator")
      return positive;
    return negative;
  }
}

export function setData<msg extends (TelegramBot.Message | ExtendedQuery<any>) = TelegramBot.Message>(key: string, data: (msg: msg, meta?: TelegramBot.Metadata) => any) {
  return async function (msg: msg, meta?: TelegramBot.Metadata) {
    const state = setup.getState(msg.from?.id)!.state;
    state.data[key] = await data(msg, meta);
    return chain.on;
  };
}

export function breakChain() {
  return async function () {
    return chain.break;
  }
}

const emitNotSupergroup = new MessageEmitter<string, MessageListener | QueryListener>(setup, "Це не груповий суперчат!", responseTarget.REPLY)
  .addOption(hideButton);

const emitNotSetUp = new MessageEmitter<string, MessageListener | QueryListener>(setup, "Спільноту не налаштовано!\n\n/setup - налаштувати спільноту", responseTarget.REPLY)
  .addOption(hideButton);

const emitNotAdmin = new MessageEmitter<string, MessageListener | QueryListener>(setup, "Ви не адміністратор чату!", responseTarget.REPLY)
  .addOption(hideButton);

const emitErrorPrivate = new MessageEmitter<string, MessageListener | QueryListener>(setup, "Помилка!", responseTarget.PRIVATE)
  .addOption(hideButton);

const emitErrorReply = new MessageEmitter<string, MessageListener | QueryListener>(setup, "Помилка!", responseTarget.REPLY)
  .addOption(hideButton);

function parseMessageToEmit(msg: TelegramBot.Message, meta?: TelegramBot.Metadata): [
  TelegramBot.ChatId,
  number,
  undefined,
  number,
  TelegramBot.Message,
  TelegramBot.Metadata
] {
  return [msg.chat.id, msg.from!.id, undefined, msg.message_id, msg, meta!];
}

function parseQueryToEmitPrivate(query: ExtendedQuery<any>): [
  TelegramBot.ChatId,
  number,
  undefined,
  undefined,
  ExtendedQuery<any>
] {
  return [query.from.id, query.from.id, undefined, undefined, query];
}

function parseQueryToEmit(query: ExtendedQuery<any>): [
  TelegramBot.ChatId,
  number,
  undefined,
  number,
  ExtendedQuery<any>
] {
  return [query.from.id, query.from.id, undefined, query.message!.message_id, query];
}

export function verifyAuthority(owner = true) {
  return async function (input: TelegramBot.Message | ExtendedQuery<any>, meta?: TelegramBot.Metadata) {
    const msg = toMessage(input);
    const query = toQuery(input);
    if (msg) {
      if (msg.chat.type !== "supergroup") {
        await emitNotSupergroup.emit(...parseMessageToEmit(msg, meta));
        return chain.escape;
      }
      const community = getCommunity(msg); 
      if (community == null) {
        await emitNotSetUp.emit(...parseMessageToEmit(msg, meta));
        return chain.escape;
      }
      const user = msg.from!;
      const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
      if (admin == null) {
        await emitNotAdmin.emit(...parseMessageToEmit(msg, meta));
        return chain.escape;
      }
    }
    if (query) {
      if (query.message == null) {
        await emitErrorPrivate.emit(...parseQueryToEmitPrivate(query));
        return chain.escape;
      }
      let community: Community | null = null;
      if (query.message.chat.type !== "private") {
        if (query.message.chat.type !== "supergroup") {
          await emitNotSupergroup.emit(...parseQueryToEmit(query));
          return chain.escape;
        }
        community = getCommunity(query);
        if (community == null) {
          await emitNotSetUp.emit(...parseQueryToEmit(query));
          return chain.escape;
        }
      }
      const user = query.from ?? {} as TelegramBot.User;
      if (community == null) {
        await emitErrorReply.emit(...parseQueryToEmit(query));
        return chain.escape;
      }
      const admin = community.admins.find(admin => admin.id === user.id && (!owner || admin.owner));
      if (admin == null) {
        await emitNotAdmin.emit(...parseQueryToEmit(query));
        return chain.escape;
      }
    }
    return chain.on;
  };
}