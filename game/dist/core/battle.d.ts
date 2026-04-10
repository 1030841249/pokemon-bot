import { BattleState, PokemonInstance, BattleAction } from './types';
export declare class BattleEngine {
    static createBattle(playerPokemon: PokemonInstance, enemyPokemon: PokemonInstance, type: 'wild' | 'trainer', playerParty?: PokemonInstance[]): BattleState;
    static executeTurn(state: BattleState, playerAction: BattleAction, enemyAction: BattleAction): {
        messages: string[];
        isOver: boolean;
    };
    private static processStatusEffects;
    private static canPokemonAct;
    private static getEffectiveSpeed;
    private static applyAbilityOnEntry;
    private static executeAction;
    private static executeSwitch;
    private static executeAttack;
    private static calculateDamage;
    private static getTypeEffectiveness;
    private static getStabBonus;
    private static executeRun;
    static hasAlivePartyMember(state: BattleState): boolean;
    private static checkBattleEnd;
    static getEnemyAction(state: BattleState): BattleAction;
    static getExpReward(state: BattleState): number;
    static canCatch(state: BattleState, ballCatchRate: number): {
        success: boolean;
        shakes: number;
    };
}
//# sourceMappingURL=battle.d.ts.map