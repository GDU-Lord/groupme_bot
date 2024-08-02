import { Message, Metadata } from "node-telegram-bot-api";
import { MessageListener, QueryListener } from "../core/listener.js";
import MessageEmitter from "../core/message.js";
import Insert from "./insert.js";

export default class StateInsertEmitter extends MessageEmitter<string, QueryListener | MessageListener> {

  insert: Insert;

  constructor(...args: MessageEmitter["args"]) {
    super(...args);
    this.insert = new Insert(this.data.toString());
  }

  getText(...args: [Message, Metadata]): string {
    const [input] = args;
    return input.text ?? "";
  }

}