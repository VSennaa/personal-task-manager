import readline from "node:readline";

export function promptVisible(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const CHAR_CODE_ENTER_LF = 10;
const CHAR_CODE_ENTER_CR = 13;
const CHAR_CODE_CTRL_C = 3;
const CHAR_CODE_BACKSPACE = 127;
const CHAR_CODE_BACKSPACE_ALT = 8;

export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);

    let value = "";
    const onData = (char: Buffer) => {
      const code = char[0];

      if (code === CHAR_CODE_ENTER_LF || code === CHAR_CODE_ENTER_CR) {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
        return;
      }

      if (code === CHAR_CODE_CTRL_C) {
        process.stdout.write("\n");
        process.exit(1);
      }

      if (code === CHAR_CODE_BACKSPACE || code === CHAR_CODE_BACKSPACE_ALT) {
        value = value.slice(0, -1);
        return;
      }

      value += char.toString("utf8");
    };

    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  });
}
