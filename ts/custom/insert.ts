import { getBottom } from "./utils.js";

export default class Insert {

  constructor(
    public text: string
  ) {}

  getText(data: {
    [key: string]: any
  }) {
    let res = this.text;
    const match = this.text.match(/\{[_0-9A-Za-z\.]{1,}\}/g);
    match?.forEach((key) => {
      key = key.slice(1, key.length-1);
      res = res.replaceAll(`{${key}}`, String(getBottom(data, key.split(".")) ?? ""));
    });
    return res;
  }

}