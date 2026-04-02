import * as fs from 'fs';
import * as path from 'path';
import { Player } from '../core/types';

const SAVE_DIR = path.join(__dirname, '../../saves');

export class SaveManager {
  static ensureSaveDir(): void {
    if (!fs.existsSync(SAVE_DIR)) {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
    }
  }

  static getSavePath(slot: number): string {
    return path.join(SAVE_DIR, `save_${slot}.json`);
  }

  static save(player: Player, slot: number): boolean {
    try {
      this.ensureSaveDir();
      const savePath = this.getSavePath(slot);
      fs.writeFileSync(savePath, JSON.stringify(player, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      return false;
    }
  }

  static load(slot: number): Player | null {
    try {
      const savePath = this.getSavePath(slot);
      if (!fs.existsSync(savePath)) {
        return null;
      }
      const data = fs.readFileSync(savePath, 'utf-8');
      return JSON.parse(data) as Player;
    } catch (error) {
      console.error('读取存档失败:', error);
      return null;
    }
  }

  static delete(slot: number): boolean {
    try {
      const savePath = this.getSavePath(slot);
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
      return true;
    } catch (error) {
      console.error('删除存档失败:', error);
      return false;
    }
  }

  static exists(slot: number): boolean {
    const savePath = this.getSavePath(slot);
    return fs.existsSync(savePath);
  }

  static getSaveInfo(slot: number): { name: string; badges: number; playTime: number } | null {
    const player = this.load(slot);
    if (!player) return null;
    
    return {
      name: player.name,
      badges: player.badges,
      playTime: player.playTime
    };
  }

  static getAllSaves(): { slot: number; info: { name: string; badges: number; playTime: number } | null }[] {
    const saves: { slot: number; info: { name: string; badges: number; playTime: number } | null }[] = [];
    
    for (let i = 1; i <= 3; i++) {
      saves.push({
        slot: i,
        info: this.getSaveInfo(i)
      });
    }
    
    return saves;
  }

  static formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
