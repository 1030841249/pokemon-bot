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
exports.SaveManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SAVE_DIR = path.join(__dirname, '../../saves');
class SaveManager {
    static ensureSaveDir() {
        if (!fs.existsSync(SAVE_DIR)) {
            fs.mkdirSync(SAVE_DIR, { recursive: true });
        }
    }
    static getSavePath(slot) {
        return path.join(SAVE_DIR, `save_${slot}.json`);
    }
    static save(player, slot) {
        try {
            this.ensureSaveDir();
            const savePath = this.getSavePath(slot);
            fs.writeFileSync(savePath, JSON.stringify(player, null, 2), 'utf-8');
            return true;
        }
        catch (error) {
            console.error('保存失败:', error);
            return false;
        }
    }
    static load(slot) {
        try {
            const savePath = this.getSavePath(slot);
            if (!fs.existsSync(savePath)) {
                return null;
            }
            const data = fs.readFileSync(savePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error('读取存档失败:', error);
            return null;
        }
    }
    static delete(slot) {
        try {
            const savePath = this.getSavePath(slot);
            if (fs.existsSync(savePath)) {
                fs.unlinkSync(savePath);
            }
            return true;
        }
        catch (error) {
            console.error('删除存档失败:', error);
            return false;
        }
    }
    static exists(slot) {
        const savePath = this.getSavePath(slot);
        return fs.existsSync(savePath);
    }
    static getSaveInfo(slot) {
        const player = this.load(slot);
        if (!player)
            return null;
        return {
            name: player.name,
            badges: player.badges,
            playTime: player.playTime
        };
    }
    static getAllSaves() {
        const saves = [];
        for (let i = 1; i <= 3; i++) {
            saves.push({
                slot: i,
                info: this.getSaveInfo(i)
            });
        }
        return saves;
    }
    static formatPlayTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}
exports.SaveManager = SaveManager;
