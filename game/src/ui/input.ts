import * as readline from 'readline';

export class InputHandler {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async getInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async getMenuChoice(max: number, prompt: string = '请选择: '): Promise<number> {
    while (true) {
      const input = await this.getInput(prompt);
      const choice = parseInt(input, 10);
      
      if (!isNaN(choice) && choice >= 0 && choice <= max) {
        return choice;
      }
      
      console.log('无效输入，请重新选择。');
    }
  }

  async getYesNo(prompt: string): Promise<boolean> {
    while (true) {
      const input = await this.getInput(`${prompt} (y/n): `);
      if (input.toLowerCase() === 'y' || input.toLowerCase() === 'yes') {
        return true;
      }
      if (input.toLowerCase() === 'n' || input.toLowerCase() === 'no') {
        return false;
      }
      console.log('请输入 y 或 n。');
    }
  }

  async getText(prompt: string): Promise<string> {
    return this.getInput(`${prompt}: `);
  }

  async waitForKey(prompt: string = '按回车键继续...'): Promise<void> {
    await this.getInput(prompt);
  }

  close(): void {
    this.rl.close();
  }
}
