import { BattleState, BattleAction, PokemonInstance } from './types';
export declare class BattleEngine {
    static createBattle(playerPokemon: PokemonInstance, enemyPokemon: PokemonInstance, type?: 'wild' | 'trainer'): BattleState;
    static executeTurn(state: BattleState, playerAction: BattleAction, enemyAction: BattleAction): BattleState;
    private static executeAction;
    private static executeAttack;
    private static calculateDamage;
    private static getTypeEffectiveness;
    private static getStabBonus;
    private static executeRun;
    private static checkBattleEnd;
    private static addLog;
    static getEnemyAction(state: BattleState): BattleAction;
    static getExpReward(state: BattleState): number;
    static canCatch(state: BattleState, ballCatchRate: number): {
        success: boolean;
        shakes: number;
    };
}
//# sourceMappingURL=battle.d.ts.map