"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerManager = void 0;
const pokemon_1 = require("../core/pokemon");
const STARTER_POKEMON = [1, 4, 7];
class PlayerManager {
    static createPlayer(name, starterIndex) {
        const starterId = STARTER_POKEMON[starterIndex] || STARTER_POKEMON[0];
        const starter = pokemon_1.PokemonManager.createPokemon(starterId, 5);
        return {
            name,
            party: starter ? [starter] : [],
            pc: Array(30).fill(null).map(() => []),
            inventory: [
                { itemId: 1, quantity: 5 },
                { itemId: 10, quantity: 3 }
            ],
            badges: 0,
            money: 3000,
            currentLocation: 'pallet-town',
            playTime: 0
        };
    }
    static addPokemon(player, pokemon) {
        if (player.party.length < 6) {
            player.party.push(pokemon);
            return true;
        }
        for (let i = 0; i < player.pc.length; i++) {
            if (player.pc[i].length < 30) {
                player.pc[i].push(pokemon);
                return true;
            }
        }
        return false;
    }
    static removePokemon(player, index) {
        if (index >= 0 && index < player.party.length) {
            return player.party.splice(index, 1)[0];
        }
        return null;
    }
    static swapPokemon(player, index1, index2) {
        if (index1 >= 0 && index1 < player.party.length &&
            index2 >= 0 && index2 < player.party.length) {
            const temp = player.party[index1];
            player.party[index1] = player.party[index2];
            player.party[index2] = temp;
            return true;
        }
        return false;
    }
    static getFirstHealthyPokemon(player) {
        for (const pokemon of player.party) {
            if (!pokemon_1.PokemonManager.isFainted(pokemon)) {
                return pokemon;
            }
        }
        return null;
    }
    static hasHealthyPokemon(player) {
        return player.party.some(p => !pokemon_1.PokemonManager.isFainted(p));
    }
    static addItem(player, itemId, quantity = 1) {
        const existing = player.inventory.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += quantity;
        }
        else {
            player.inventory.push({ itemId, quantity });
        }
    }
    static removeItem(player, itemId, quantity = 1) {
        const existing = player.inventory.find(i => i.itemId === itemId);
        if (!existing || existing.quantity < quantity) {
            return false;
        }
        existing.quantity -= quantity;
        if (existing.quantity <= 0) {
            player.inventory = player.inventory.filter(i => i.itemId !== itemId);
        }
        return true;
    }
    static hasItem(player, itemId, quantity = 1) {
        const existing = player.inventory.find(i => i.itemId === itemId);
        return existing !== undefined && existing.quantity >= quantity;
    }
    static getItemQuantity(player, itemId) {
        const existing = player.inventory.find(i => i.itemId === itemId);
        return existing?.quantity || 0;
    }
    static addMoney(player, amount) {
        player.money += amount;
    }
    static removeMoney(player, amount) {
        if (player.money >= amount) {
            player.money -= amount;
            return true;
        }
        return false;
    }
    static addBadge(player) {
        player.badges++;
    }
    static healAllPokemon(player) {
        for (const pokemon of player.party) {
            pokemon_1.PokemonManager.healFully(pokemon);
        }
    }
    static gainExpToParty(player, exp, participants) {
        for (const index of participants) {
            if (index >= 0 && index < player.party.length) {
                const pokemon = player.party[index];
                const canEvolve = pokemon_1.PokemonManager.gainExp(pokemon, exp);
                if (canEvolve) {
                    const base = pokemon_1.PokemonManager.getPokemonBase(pokemon.baseId);
                    if (base?.evolution) {
                        pokemon_1.PokemonManager.evolve(pokemon);
                    }
                }
            }
        }
    }
    static getPartyStatus(player) {
        return player.party.map((pokemon, index) => {
            const name = pokemon_1.PokemonManager.getPokemonName(pokemon);
            const hp = `${pokemon.currentHp}/${pokemon.stats.hp}`;
            const status = pokemon_1.PokemonManager.isFainted(pokemon) ? ' [濒死]' : '';
            return `${index + 1}. ${name} Lv.${pokemon.level} HP:${hp}${status}`;
        });
    }
}
exports.PlayerManager = PlayerManager;
//# sourceMappingURL=player.js.map