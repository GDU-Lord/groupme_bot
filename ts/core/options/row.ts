import { InlineKeyboardButton } from "node-telegram-bot-api";
import BotSetup from "../botSetup.js"
import Option, { optionType } from "./option.js"

export default class RowOption extends Option {

  type: optionType = optionType.ROW;

  override init(setup: BotSetup): this {
    this.setup = setup;
    return this;
  }

  async parse(inline_keyboard: InlineKeyboardButton[][]) {
    inline_keyboard.push([]);
  }
  
}