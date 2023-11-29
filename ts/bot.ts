import TelegramBot, { Message, Metadata } from "node-telegram-bot-api";
import "dotenv/config";
import { MessageListener, QueryListener } from "./listener.js";

export const bot = new TelegramBot(
 process.env.TOKEN as string,
 {
  polling: true
 }
);

export function sendMessage(chatId: TelegramBot.ChatId, message: string, markup?: TelegramBot.SendMessageOptions["reply_markup"], thread_id: number = -1) {
  return bot.sendMessage(chatId, message, {
    reply_markup: markup,
    parse_mode: "Markdown",
    message_thread_id: thread_id >= 0 ? thread_id : undefined
  });
}

export function sendThreadMessage(chatId: TelegramBot.ChatId, thread_id: number = -1, message: string, markup?: TelegramBot.SendMessageOptions["reply_markup"]) {
  return bot.sendMessage(chatId, message, {
    reply_markup: markup,
    parse_mode: "Markdown",
    message_thread_id: thread_id
  });
}

export function replyToMessage(requestMessage: Message, message: string, markup?: TelegramBot.SendMessageOptions["reply_markup"]) {
  return bot.sendMessage(requestMessage.chat.id, message, {
    reply_markup: markup,
    parse_mode: "Markdown",
    reply_to_message_id: requestMessage.message_id
  });
}

export function addQueryListener(selector: string, callback: QueryListener["callback"]) {
  return new QueryListener((query) => {
    try {
      const data = JSON.parse(query.data as string) as [string, any?];
      if(data[0] !== selector) return;
      callback(query, data[1]);
    } catch {}
  });
} 

export type option = ([string, any?] | string);

export function arrange<type>(source: type[], columns = 4, final: type[] = []) {
  const rows: type[][] = [[]];
  for(const entry of source) {
    if(rows[rows.length-1].length >= columns)
      rows.push([]);
    rows[rows.length-1].push(entry);
  }
  if(final.length === 0) return rows;
  rows.push(final);
  return rows;
}

export function getButtonsMarkup(options: option[][], tags: string | string[]): TelegramBot.InlineKeyboardMarkup {
  const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = options.map((row, rowIndex, rows) => row.map((option, index) => {
    const text = option instanceof Array ? option[0] : option;
    const data = option instanceof Array ? option[1] : undefined;
    const tag = tags instanceof Array ? tags[rowIndex * rows[0].length + index] : tags;
    return {
      text: text,
      callback_data: JSON.stringify([tag, data]),
    };
  }));
  return {
    inline_keyboard
  };
}

export function addMessageListener(callback: MessageListener["callback"]) {
  return new MessageListener(callback);
}

bot.addListener("message", async (msg, meta) => {
  for(const i in MessageListener.list) {
    const listener = MessageListener.list[i];
    const res = await listener.callback(msg, meta);
    if(res) break;
  }
});

bot.addListener("callback_query", async (query) => {
  for(const i in QueryListener.list) {
    const listener = QueryListener.list[i];
    const res = await listener.callback(query);
    if(res) break;
  }
});

export function addCommandListener(selector: string, callback: MessageListener["callback"]) {
  return new MessageListener(async (msg, meta) => {
    if(msg.text !== "/" + selector && msg.text !== "/" + selector + "@" + (await bot.getMe()).username) return;
    callback(msg, meta);
  });
}

export function getThreadId(msg: Message) {
  const t = msg.message_thread_id ?? -Infinity;
  const id = msg.message_id;
  return t+1 === id ? 0 : t;
}

export const addEventListener = bot.on.bind(bot);