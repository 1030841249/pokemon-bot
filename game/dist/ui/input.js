"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputHandler = void 0;
const readline = __importStar(require("readline"));
class InputHandler {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    async getInput(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }
    async getMenuChoice(max, prompt = '请选择: ') {
        while (true) {
            const input = await this.getInput(prompt);
            const choice = parseInt(input, 10);
            if (!isNaN(choice) && choice >= 0 && choice <= max) {
                return choice;
            }
            console.log('无效输入，请重新选择。');
        }
    }
    async getYesNo(prompt) {
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
    async getText(prompt) {
        return this.getInput(`${prompt}: `);
    }
    async waitForKey(prompt = '按回车键继续...') {
        await this.getInput(prompt);
    }
    close() {
        this.rl.close();
    }
}
exports.InputHandler = InputHandler;
//# sourceMappingURL=input.js.map