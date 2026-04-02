import { Player, BattleState } from './core/types';
type GameScene = 'main_menu' | 'starter_select' | 'name_input' | 'location' | 'explore' | 'battle' | 'battle_menu' | 'move_select' | 'party' | 'inventory' | 'move_location';
interface Session {
    userId: string;
    groupId?: string;
    player: Player | null;
    scene: GameScene;
    battleState: BattleState | null;
    tempData: {
        starterChoice?: number;
        selectedMoveIndex?: number;
        selectedLocation?: string;
        encounter?: any;
    };
}
export declare class SessionManager {
    private sessions;
    private saveDir;
    constructor(saveDir?: string);
    getSession(userId: string, groupId?: string): Session;
    private getSessionKey;
    loadPlayer(userId: string, groupId?: string): Player | null;
    savePlayer(session: Session): boolean;
    handleInput(userId: string, message: string, groupId?: string): string;
    private handleMainMenu;
    private handleStarterSelect;
    private handleNameInput;
    private handleLocation;
    private handleExplore;
    private selectWildEncounter;
    private startWildBattle;
    private handleBattle;
    private handleMoveSelect;
    private handleUseBall;
    private handleRun;
    private executeBattleTurn;
    private syncPlayerPokemon;
    private getBattleLog;
    private handleMoveLocation;
    renderMainMenu(session: Session): string;
    private renderStarterSelect;
    private renderLocation;
    private renderBattleMenu;
    private renderMoveSelect;
    private renderMoveLocation;
    private renderParty;
    private renderInventory;
}
export {};
