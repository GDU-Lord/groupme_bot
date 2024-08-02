import { Message, Metadata } from "node-telegram-bot-api";
import { ExtendedQuery, MessageListener, QueryListener } from "../core/listener.js";
import MessageEmitter from "../core/message.js";
import { state } from "../commands/shared.js";
import Insert from "./insert.js";

export default class StateInsertEmitter extends MessageEmitter<string, QueryListener | MessageListener> {

  insert: Insert;

  constructor(...args: MessageEmitter["args"]) {
    super(...args);
    this.insert = new Insert(this.data.toString());
  }

  getText(...args: [ExtendedQuery<any>] | [Message, Metadata]): string {
    const [input] = args;
    const state = this.setup.getState(input.from?.id)?.state as state;
    if(state == null) return "ERROR: STATE NOT FOUND!";
    return this.insert.getText(state);
  }

}