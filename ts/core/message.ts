import BotSetup from "./botSetup.js";
import { Listener } from "./listener.js";
import { responseTarget } from "./response.js";
import { args, idCounter } from "./utils.js";
import Option, { OptionInstance, optionType } from "./options/option.js";
import TelegramBot, { ChatId, ParseMode } from "node-telegram-bot-api";
import { ObjectId } from "mongodb";

export default class MessageEmitter<D = any, L extends Listener = Listener, A extends any[] = [
  BotSetup,
  D,
  responseTarget,
  number?,
], LA extends any[] = args<L>> {

  readonly options: Option[] = [];
  readonly optionInstanceBlocks: {
    [key: string]: OptionInstance[];
  } = {};

  declare args: A;

  constructor(
    public setup: BotSetup,
    public data: D,
    public target: responseTarget,
    public defaultThread: number = 1,
  ) {}

  getText(...args: LA) {
    return String(this.data);
  }

  addOption(option: Option) {
    this.options.push(option.setOriginMessage(this));
    return this;
  }

  addOptionInstanceBlock(options: OptionInstance[], messageInstanceId: ObjectId) {
    this.optionInstanceBlocks[messageInstanceId.toString()] = options;
  }

  closeOptionInstanceBlock(messageInstanceId: ObjectId) {
    this.optionInstanceBlocks[messageInstanceId.toString()].forEach(option => {
      option.close();
    });
  }

  async emit<_args extends any[] = args<L>>(chat_id: ChatId, toUserId: number | undefined, thread_id: number | undefined, message_id: number | undefined, ...args: _args): Promise<TelegramBot.Message> {

    thread_id = thread_id ?? this.defaultThread;

    const inline_keyboard = await this.getOptions(toUserId, this.data, this.setup.getState(toUserId)!);

    const text = this.getText(...args as args<L>);

    try {

      switch(this.target) {
        case responseTarget.PRIVATE:
          return await this.setup.bot.sendMessage(chat_id, text, { ...this.setup.options.sendMessageOptions, reply_markup: { inline_keyboard } });
        case responseTarget.COMMUNITY:
          return await this.setup.bot.sendMessage(chat_id, text, { ...this.setup.options.sendMessageOptions, reply_markup: { inline_keyboard } });
        case responseTarget.LOCAL:
          try {
            return await this.setup.bot.sendMessage(chat_id, text, { ...this.setup.options.sendMessageOptions, reply_markup: { inline_keyboard }, message_thread_id: thread_id });
          }
          catch {
            return await this.setup.bot.sendMessage(chat_id, text, { ...this.setup.options.sendMessageOptions, reply_markup: { inline_keyboard }, reply_to_message_id: message_id });
          }
        case responseTarget.REPLY:
          return await this.setup.bot.sendMessage(chat_id, text, { ...this.setup.options.sendMessageOptions, reply_markup: { inline_keyboard }, reply_to_message_id: message_id });
      }

    }
    catch (err) {
      console.log(err);
      return await this.setup.bot.sendMessage(chat_id, "ERROR");
    }
  }

  async getOptions(toUserId: number | undefined, data: D, state: BotSetup["states"][string]) {

    const inline_keyboard: TelegramBot.InlineKeyboardMarkup["inline_keyboard"] = [[]];

    const messageInstanceId = new ObjectId;

    const optionInstanceBlock: OptionInstance[] = [];
    
    const promises = this.options.map(async (option, index) => {

      const id = idCounter.next().value!;
      
      option.init(this.setup, id, messageInstanceId, toUserId, data);
      await option.parse(inline_keyboard, id, this.data, state);

      optionInstanceBlock.push(option.instances[id.toString()]);

      return null;
    });

    for(const promise of promises)
      await promise;

    this.addOptionInstanceBlock(optionInstanceBlock, messageInstanceId);

    return inline_keyboard;
  }

  async edit<_args extends any[] = args<L>>(chat_id: ChatId, toUserId: number | undefined, message_id: number, ...args: _args) {
    const inline_keyboard = await this.getOptions(toUserId, this.data, this.setup.getState(toUserId)!);

    const text = this.getText(...args as args<L>);

    try {
      return await this.setup.bot.editMessageText(text, {
        chat_id,
        message_id,
        parse_mode: (this.setup.options.sendMessageOptions?.["parse_mode"] ?? "HTML"),
        reply_markup: { inline_keyboard }
      });
    } catch(err) {
      console.error(err);
      return false;
    }
  }

}