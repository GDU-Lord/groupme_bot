// import TelegramBot, { CallbackQuery, Message, Metadata } from "node-telegram-bot-api";
// import "dotenv/config";
// import { MessageListener, QueryListener } from "../core/listener.js";
// import BotSetup from "../core/botSetup.js";

// export type option = ([string, any?] | string);

// export default class Bot {

//   bot: TelegramBot;
//   setup: BotSetup;

//   constructor() {
//     this.bot = new TelegramBot(
//       process.env.TOKEN as string,
//       {
//         polling: {
//           interval: 2000
//         }
//       }
//     );
//     this.setup = new BotSetup(this.bot);
//   }

//   // sendMessage(chatId: TelegramBot.ChatId, message: string, markup?: TelegramBot.SendMessageOptions["reply_markup"], thread_id: number = -1) {
//   //   return new Promise<TelegramBot.Message | null>((res, rej) => {
//   //     this.bot.sendMessage(chatId, message, {
//   //       reply_markup: markup,
//   //       parse_mode: "HTML",
//   //       message_thread_id: thread_id >= 0 ? thread_id : undefined
//   //     }).then((data) => res(data)).catch(() => res(null));
//   //   });
//   // }

//   // sendThreadMessage(chatId: TelegramBot.ChatId, thread_id: number = -1, message: string, markup?: TelegramBot.SendMessageOptions["reply_markup"]) {
//   //   return this.sendMessage(chatId, message, markup, thread_id);
//   // }

//   // replyToMessage(requestMessage: Message, message: string, markup?: TelegramBot.SendMessageOptions["reply_markup"]) {
//   //   return new Promise<TelegramBot.Message | null>((res, rej) => {
//   //     this.bot.sendMessage(requestMessage.chat.id, message, {
//   //       reply_markup: markup,
//   //       parse_mode: "HTML",
//   //       reply_to_message_id: requestMessage.message_id
//   //     }).then((data) => res(data)).catch(() => res(null));
//   //   });
//   // }

//   // deleteMessage(chatId: TelegramBot.ChatId, messageId: number) {
//   //   return new Promise<boolean>((res, rej) => {
//   //     this.bot.deleteMessage(chatId, messageId).then((data) => res(data)).catch(() => res(false));
//   //   });
//   // }

//   // arrange<type>(source: type[], columns = 4, final: type[] = []) {
//   //   const rows: type[][] = [[]];
//   //   for (const entry of source) {
//   //     if (rows[rows.length - 1].length >= columns)
//   //       rows.push([]);
//   //     rows[rows.length - 1].push(entry);
//   //   }
//   //   if (final.length === 0) return rows;
//   //   rows.push(final);
//   //   return rows;
//   // }

//   // getButtonsMarkup(options: option[][], tags: string | string[]): TelegramBot.InlineKeyboardMarkup {
//   //   const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = options.map((row, rowIndex, rows) => row.map((option, index) => {
//   //     const text = option instanceof Array ? option[0] : option;
//   //     const data = option instanceof Array ? option[1] : undefined;
//   //     const tag = tags instanceof Array ? tags[(rowIndex - 1) * rows[0].length + rows[Math.max(rowIndex - 1, 0)].length + index] : tags;
//   //     return {
//   //       text: text,
//   //       callback_data: JSON.stringify([tag, data]),
//   //     };
//   //   }));
//   //   return {
//   //     inline_keyboard
//   //   };
//   // }

//   // addCommandListener(selector: string, callback: MessageListener["callback"]) {
//   //   return new MessageListener(this.setup, async (msg, meta) => {
//   //     if (msg.text !== "/" + selector && msg.text !== "/" + selector + "@" + (await this.bot.getMe()).username) return false;
//   //     return callback(msg, meta);
//   //   });
//   // }

//   // getThreadId(msg: Message) {
//   //   const t = msg.message_thread_id ?? -Infinity;
//   //   const id = msg.message_id;
//   //   return t + 1 === id ? 0 : t;
//   // }

// }

