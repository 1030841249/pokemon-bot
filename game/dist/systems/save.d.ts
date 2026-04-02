import { Player } from '../core/types';
export declare class SaveManager {
    static ensureSaveDir(): void;
    static getSavePath(slot: number): string;
    static save(player: Player, slot: number): boolean;
    static load(slot: number): Player | null;
    static delete(slot: number): boolean;
    static exists(slot: number): boolean;
    static getSaveInfo(slot: number): {
        name: string;
        badges: number;
        playTime: number;
    } | null;
    static getAllSaves(): {
        slot: number;
        info: {
            name: string;
            badges: number;
            playTime: number;
        } | null;
    }[];
    static formatPlayTime(seconds: number): string;
}
//# sourceMappingURL=save.d.ts.map