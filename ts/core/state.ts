import TelegramBot from "node-telegram-bot-api";

export default class State<Schema> {

  constructor(
    public userId: number,
    public state: Schema
  ) {}

}