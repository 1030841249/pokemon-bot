import json
import random
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple

from nonebot import on_command, on_message, get_driver
from nonebot.adapters.onebot.v11 import (
    Bot,
    MessageEvent,
    GroupMessageEvent,
    PrivateMessageEvent,
    Message,
)
from nonebot.params import CommandArg

DATA_DIR = Path(__file__).parent.parent / "data"
SAVES_DIR = Path(__file__).parent.parent / "saves"

def load_json(filename: str) -> Any:
    path = DATA_DIR / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

pokemon_data = load_json("pokemon.json")
moves_data = load_json("moves.json")
items_data = load_json("items.json")
maps_data = load_json("maps.json")
type_chart = load_json("typeChart.json")

NATURES = {
    'hardy': {'name': '固执', 'plus': 'attack', 'minus': 'spAttack'},
    'lonely': {'name': '寂寞', 'plus': 'attack', 'minus': 'defense'},
    'brave': {'name': '勇敢', 'plus': 'attack', 'minus': 'speed'},
    'adamant': {'name': '顽皮', 'plus': 'attack', 'minus': 'spDefense'},
    'bold': {'name': '大胆', 'plus': 'defense', 'minus': 'attack'},
    'impish': {'name': '淘气', 'plus': 'defense', 'minus': 'spDefense'},
    'relaxed': {'name': '悠闲', 'plus': 'defense', 'minus': 'speed'},
    'modest': {'name': '马虎', 'plus': 'spAttack', 'minus': 'attack'},
    'mild': {'name': '温和', 'plus': 'spAttack', 'minus': 'defense'},
    'quiet': {'name': '冷静', 'plus': 'spAttack', 'minus': 'speed'},
    'rash': {'name': '急躁', 'plus': 'spAttack', 'minus': 'spDefense'},
    'calm': {'name': '稳重', 'plus': 'spDefense', 'minus': 'attack'},
    'gentle': {'name': '慎重', 'plus': 'spDefense', 'minus': 'spAttack'},
    'careful': {'name': '认真', 'plus': 'spDefense', 'minus': 'speed'},
    'timid': {'name': '胆小', 'plus': 'speed', 'minus': 'attack'},
    'hasty': {'name': '爽朗', 'plus': 'speed', 'minus': 'defense'},
    'jolly': {'name': '开朗', 'plus': 'speed', 'minus': 'spAttack'},
    'naive': {'name': '天真', 'plus': 'speed', 'minus': 'spDefense'},
    'serious': {'name': '实干', 'plus': '', 'minus': ''},
    'bashful': {'name': '害羞', 'plus': '', 'minus': ''},
    'docile': {'name': '坦率', 'plus': '', 'minus': ''},
    'quirky': {'name': '浮躁', 'plus': '', 'minus': ''},
}

sessions: Dict[str, Dict] = {}

def get_session_key(user_id: str, group_id: Optional[str] = None) -> str:
    return f"{group_id}_{user_id}" if group_id else user_id

def get_session(user_id: str, group_id: Optional[str] = None) -> Dict:
    key = get_session_key(user_id, group_id)
    if key not in sessions:
        sessions[key] = {
            "user_id": user_id,
            "group_id": group_id,
            "player": None,
            "scene": "main_menu",
            "battle_state": None,
            "temp_data": {},
        }
    return sessions[key]

def save_player(user_id: str, player: Dict, group_id: Optional[str] = None) -> bool:
    SAVES_DIR.mkdir(exist_ok=True)
    key = get_session_key(user_id, group_id)
    save_path = SAVES_DIR / f"{key}.json"
    try:
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(player, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存失败: {e}")
        return False

def load_player(user_id: str, group_id: Optional[str] = None) -> Optional[Dict]:
    key = get_session_key(user_id, group_id)
    save_path = SAVES_DIR / f"{key}.json"
    try:
        if save_path.exists():
            with open(save_path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"加载存档失败: {e}")
    return None

class PokemonManager:
    @staticmethod
    def get_pokemon_base(pokemon_id: int) -> Optional[Dict]:
        return next((p for p in pokemon_data if p["id"] == pokemon_id), None)
    
    @staticmethod
    def get_pokemon_name(pokemon: Dict) -> str:
        if not pokemon:
            return "无"
        pkmn = PokemonManager.get_pokemon_base(pokemon.get("baseId"))
        return pkmn["name"] if pkmn else f"未知#{pokemon.get('baseId', '?')}"

    @staticmethod
    def get_random_nature() -> str:
        return random.choice(list(NATURES.keys()))

    @staticmethod
    def get_nature_info(nature_key: str) -> Dict:
        return NATURES.get(nature_key, NATURES['hardy'])

    @staticmethod
    def generate_ivs() -> Dict[str, int]:
        return {stat: random.randint(0, 31) for stat in ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed']}

    @staticmethod
    def generate_evs() -> Dict[str, int]:
        return {stat: 0 for stat in ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed']}

    @staticmethod
    def calculate_stats(base: Dict, level: int, ivs: Dict, evs: Dict) -> Dict:
        base_stats = base["baseStats"]
        hp = int(((2 * base_stats["hp"] + ivs["hp"] + evs["hp"] // 4) * level) / 100) + level + 10
        
        def calc_stat(stat_name: str) -> int:
            return int(((2 * base_stats[stat_name] + ivs[stat_name] + evs[stat_name] // 4) * level) / 100) + 5
        
        return {
            "hp": hp,
            "attack": calc_stat("attack"),
            "defense": calc_stat("defense"),
            "spAttack": calc_stat("spAttack"),
            "spDefense": calc_stat("spDefense"),
            "speed": calc_stat("speed"),
        }

    @staticmethod
    def apply_nature(stats: Dict, nature: str) -> Dict:
        nature_info = NATURES.get(nature, {})
        result = stats.copy()
        plus_stat = nature_info.get('plus')
        minus_stat = nature_info.get('minus')
        if plus_stat and plus_stat in result:
            result[plus_stat] = int(result[plus_stat] * 1.1)
        if minus_stat and minus_stat in result:
            result[minus_stat] = int(result[minus_stat] * 0.9)
        return result

    @staticmethod
    def get_learned_moves(base: Dict, level: int) -> List[Dict]:
        moves = []
        if base.get("levelMoves"):
            available = sorted(
                [lm for lm in base["levelMoves"] if lm["level"] <= level],
                key=lambda x: x["level"],
                reverse=True
            )
            for lm in available:
                if len(moves) >= 4:
                    break
                if any(m["moveId"] == lm["moveId"] for m in moves):
                    continue
                move = next((m for m in moves_data if m["id"] == lm["moveId"]), None)
                if move:
                    moves.append({"moveId": lm["moveId"], "currentPp": move["pp"]})
        
        if not moves:
            for move_id in base.get("learnset", [])[:4]:
                move = next((m for m in moves_data if m["id"] == move_id), None)
                if move:
                    moves.append({"moveId": move_id, "currentPp": move["pp"]})
        return moves

    @staticmethod
    def create_pokemon(pokemon_id: int, level: int = 5, force_nature: str = None) -> Optional[Dict]:
        base = PokemonManager.get_pokemon_base(pokemon_id)
        if not base:
            return None
        
        ivs = PokemonManager.generate_ivs()
        evs = PokemonManager.generate_evs()
        stats = PokemonManager.calculate_stats(base, level, ivs, evs)
        moves = PokemonManager.get_learned_moves(base, level)
        nature = force_nature or PokemonManager.get_random_nature()
        abilities = base.get("abilities", [])
        ability = abilities[0] if isinstance(abilities, list) else abilities
        
        return {
            "baseId": pokemon_id,
            "level": level,
            "exp": PokemonManager.get_exp_for_level(level),
            "currentHp": stats["hp"],
            "stats": stats,
            "moves": moves,
            "ivs": ivs,
            "evs": evs,
            "nature": nature,
            "ability": ability,
            "statusEffects": [],
        }

    @staticmethod
    def get_exp_for_level(level: int) -> int:
        return int((level ** 3) * 1.2)

    @staticmethod
    def get_exp_for_next_level(level: int) -> int:
        return PokemonManager.get_exp_for_level(level + 1)

    @staticmethod
    def gain_exp(pokemon: Dict, exp: int) -> Dict:
        result = {"leveledUp": False, "evolved": False, "messages": []}
        pokemon["exp"] += exp
        result["messages"].append(f"{PokemonManager.get_pokemon_name(pokemon)} 获得 {exp} 经验值！")
        
        while True:
            next_exp = PokemonManager.get_exp_for_next_level(pokemon["level"])
            if pokemon["exp"] >= next_exp:
                base = PokemonManager.get_pokemon_base(pokemon["baseId"])
                if base:
                    pokemon["level"] += 1
                    pokemon["stats"] = PokemonManager.calculate_stats(base, pokemon["level"], pokemon["ivs"], pokemon["evs"])
                    pokemon["currentHp"] = max(pokemon["currentHp"], pokemon["stats"]["hp"])
                    result["leveledUp"] = True
                    result["messages"].append(f"★ {PokemonManager.get_pokemon_name(pokemon)} 升到了 Lv.{pokemon['level']}！")
                    
                    new_moves = PokemonManager.get_new_moves_for_level(pokemon["baseId"], pokemon["level"])
                    for move_id in new_moves:
                        learn_result = PokemonManager.try_learn_move(pokemon, move_id)
                        if learn_result["learned"]:
                            result["messages"].append(f"  {learn_result['message']}")
                    
                    evo_result = PokemonManager.check_evolution(pokemon)
                    if evo_result["evolved"]:
                        result["evolved"] = True
                        result["messages"].extend(evo_result["messages"])
            else:
                break
        return result

    @staticmethod
    def get_new_moves_for_level(base_id: int, level: int) -> List[int]:
        base = PokemonManager.get_pokemon_base(base_id)
        if not base or not base.get("levelMoves"):
            return []
        return [lm["moveId"] for lm in base["levelMoves"] if lm["level"] == level]

    @staticmethod
    def try_learn_move(pokemon: Dict, move_id: int) -> Dict:
        move = next((m for m in moves_data if m["id"] == move_id), None)
        if not move:
            return {"learned": False, "message": ""}
        
        name = PokemonManager.get_pokemon_name(pokemon)
        if any(m["moveId"] == move_id for m in pokemon.get("moves", [])):
            return {"learned": False, "message": ""}
        
        if len(pokemon["moves"]) < 4:
            pokemon["moves"].append({"moveId": move_id, "currentPp": move["pp"]})
            return {"learned": True, "message": f"{name} 学会了 {move['name']}！"}
        
        forgotten = pokemon["moves"].pop(0)
        forgotten_move = next((m for m in moves_data if m["id"] == forgotten["moveId"]), None)
        pokemon["moves"].append({"moveId": move_id, "currentPp": move["pp"]})
        return {"learned": True, "message": f"{name} 学会了 {move['name']}！忘记了 {forgotten_move['name'] if forgotten_move else '旧技能'}"}

    @staticmethod
    def check_evolution(pokemon: Dict) -> Dict:
        result = {"evolved": False, "messages": []}
        base = PokemonManager.get_pokemon_base(pokemon["baseId"])
        if not base or not base.get("evolutions"):
            return result
        
        for evo in base["evolutions"]:
            if evo.get("type") == "level" and pokemon["level"] >= evo.get("level", 999):
                old_name = PokemonManager.get_pokemon_name(pokemon)
                new_base = PokemonManager.get_pokemon_base(evo["evolvesTo"])
                
                if new_base:
                    pokemon["baseId"] = evo["evolvesTo"]
                    pokemon["stats"] = PokemonManager.calculate_stats(new_base, pokemon["level"], pokemon["ivs"], pokemon["evs"])
                    pokemon["currentHp"] = pokemon["stats"]["hp"]
                    abilities = new_base.get("abilities", [])
                    pokemon["ability"] = abilities[0] if isinstance(abilities, list) else abilities
                    
                    result["evolved"] = True
                    result["messages"].extend([
                        "",
                        "✦✦✦ 进化！ ✦✦✦",
                        f"{old_name}",
                        "   ↓ ↓ ↓",
                        f"{new_base['name']}",
                        "✦✦✦ 进化完成！ ✦✦✦",
                        f"  属性: {'/'.join(new_base.get('types', []))}",
                        f"  特性: {pokemon['ability']}",
                    ])
        return result

    @staticmethod
    def can_evolve(pokemon: Dict) -> Dict:
        base = PokemonManager.get_pokemon_base(pokemon["baseId"])
        if not base or not base.get("evolutions"):
            return {"can": False}
        
        for evo in base["evolutions"]:
            if evo.get("type") == "level":
                if pokemon["level"] >= evo.get("level", 999):
                    return {"can": True, "method": "升级", "requirement": f"Lv.{evo['level']}"}
                return {"can": True, "method": "升级", "requirement": f"需要 Lv.{evo['level']}"}
        return {"can": False}

    @staticmethod
    def get_evolution_chain(base_id: int) -> List[str]:
        chain = []
        current_id = base_id
        visited = set()
        
        while current_id and len(visited) < 10 and current_id not in visited:
            visited.add(current_id)
            base = PokemonManager.get_pokemon_base(current_id)
            if base:
                chain.append(base["name"])
                if base.get("evolutions"):
                    current_id = base["evolutions"][0].get("evolvesTo")
                else:
                    break
            else:
                break
        return chain

    @staticmethod
    def get_hp_bar(current: int, max_hp: int, width: int = 8) -> str:
        if max_hp <= 0:
            return "░" * width
        ratio = current / max_hp
        filled = int(ratio * width)
        return "█" * filled + "░" * (width - filled)

    @staticmethod
    def is_fainted(pokemon: Dict) -> bool:
        return pokemon.get("currentHp", 0) <= 0

    @staticmethod
    def heal(pokemon: Dict, amount: int) -> int:
        max_hp = pokemon["stats"]["hp"]
        healed = min(amount, max_hp - pokemon["currentHp"])
        pokemon["currentHp"] += healed
        return healed

    @staticmethod
    def heal_fully(pokemon: Dict) -> None:
        pokemon["currentHp"] = pokemon["stats"]["hp"]
        for move in pokemon.get("moves", []):
            move_data = next((m for m in moves_data if m["id"] == move["moveId"]), None)
            if move_data:
                move["currentPp"] = move_data["pp"]
        pokemon["statusEffects"] = []

    @staticmethod
    def get_iv_rating(ivs: Dict) -> str:
        total = sum(ivs.values())
        max_total = 32 * 6
        percentage = total / max_total
        
        if percentage > 0.9:
            return "完美"
        if percentage > 0.8:
            return "优秀"
        if percentage > 0.6:
            return "良好"
        if percentage > 0.4:
            return "普通"
        return "一般"

    @staticmethod
    def get_status_effectiveness(status: str) -> Dict:
        effects = {
            "poison": {"damagePerTurn": 8, "canAttack": True},
            "burn": {"damagePerTurn": 8, "canAttack": True},
            "paralysis": {"damagePerTurn": 0, "canAttack": random.random() > 0.25},
            "freeze": {"damagePerTurn": 0, "canAttack": False},
            "sleep": {"damagePerTurn": 0, "canAttack": False},
        }
        return effects.get(status, {"damagePerTurn": 0, "canAttack": True})


class PlayerManager:
    STARTER_POKEMON = [1, 4, 7]

    @classmethod
    def create_player(cls, name: str, starter_index: int = 0) -> Dict:
        starter_id = cls.STARTER_POKEMON[starter_index % len(cls.STARTER_POKEMON)]
        starter = PokemonManager.create_pokemon(starter_id, 5)
        
        return {
            "name": name,
            "badges": 0,
            "money": 3000,
            "currentLocation": "pallet-town",
            "party": [starter] if starter else [],
            "pc": [[] for _ in range(30)],
            "inventory": [
                {"itemId": 1, "quantity": 5},
                {"itemId": 10, "quantity": 3},
            ],
            "playTime": 0,
        }

    @classmethod
    def add_pokemon(cls, player: Dict, pokemon: Dict) -> Dict:
        if len(player["party"]) < 6:
            player["party"].append(pokemon)
            return {"success": True, "toPC": False, "message": f"已加入队伍！({len(player['party'])}/6)"}
        
        for i, box in enumerate(player["pc"]):
            if len(box) < 30:
                box.append(pokemon)
                return {"success": True, "toPC": True, "message": f"队伍已满！已存入电脑盒子{i+1} ({len(box)}/30)"}
        
        return {"success": False, "toPC": False, "message": "电脑也满了！无法存储更多宝可梦。"}

    @classmethod
    def get_pc_count(cls, player: Dict) -> int:
        return sum(len(box) for box in player["pc"])

    @classmethod
    def get_first_healthy(cls, player: Dict) -> Optional[Dict]:
        for pokemon in player.get("party", []):
            if not PokemonManager.is_fainted(pokemon):
                return pokemon
        return None

    @classmethod
    def has_healthy_pokemon(cls, player: Dict) -> bool:
        return any(not PokemonManager.is_fainted(p) for p in player.get("party", []))

    @classmethod
    def add_item(cls, player: Dict, item_id: int, quantity: int = 1) -> None:
        existing = next((i for i in player["inventory"] if i["itemId"] == item_id), None)
        if existing:
            existing["quantity"] += quantity
        else:
            player["inventory"].append({"itemId": item_id, "quantity": quantity})

    @classmethod
    def remove_item(cls, player: Dict, item_id: int, quantity: int = 1) -> bool:
        existing = next((i for i in player["inventory"] if i["itemId"] == item_id), None)
        if not existing or existing["quantity"] < quantity:
            return False
        
        existing["quantity"] -= quantity
        if existing["quantity"] <= 0:
            player["inventory"] = [i for i in player["inventory"] if i["itemId"] != item_id]
        return True

    @classmethod
    def has_item(cls, player: Dict, item_id: int, quantity: int = 1) -> bool:
        existing = next((i for i in player["inventory"] if i["itemId"] == item_id), None)
        return existing is not None and existing["quantity"] >= quantity

    @classmethod
    def add_money(cls, player: Dict, amount: int) -> None:
        player["money"] += amount

    @classmethod
    def remove_money(cls, player: Dict, amount: int) -> bool:
        if player["money"] >= amount:
            player["money"] -= amount
            return True
        return False

    @classmethod
    def heal_all_pokemon(cls, player: Dict) -> None:
        for pokemon in player.get("party", []):
            PokemonManager.heal_fully(pokemon)


class BattleEngine:
    @staticmethod
    def create_battle(player_pokemon: Dict, enemy_pokemon: Dict, battle_type: str = "wild") -> Dict:
        return {
            "playerPokemon": player_pokemon.copy(),
            "enemyPokemon": enemy_pokemon.copy(),
            "type": battle_type,
            "turn": 0,
            "log": [],
            "isOver": False,
            "winner": None,
        }

    @staticmethod
    def get_enemy_action(battle_state: Dict) -> Dict:
        moves = battle_state["enemyPokemon"].get("moves", [])
        if moves:
            return {"type": "attack", "moveId": random.choice(moves)["moveId"]}
        return {"type": "wait"}

    @staticmethod
    def execute_turn(battle_state: Dict, player_action: Dict, enemy_action: Dict) -> Dict:
        messages = []
        pp = battle_state["playerPokemon"]
        ep = battle_state["enemyPokemon"]
        
        pp_can_attack = BattleEngine.can_act(pp)
        ep_can_attack = BattleEngine.can_act(ep)
        
        pp_speed = pp["stats"]["speed"]
        ep_speed = ep["stats"]["speed"]
        if "paralysis" in pp.get("statusEffects", []):
            pp_speed = int(pp_speed * 0.25)
        if "paralysis" in ep.get("statusEffects", []):
            ep_speed = int(ep_speed * 0.25)
        
        player_first = pp_speed > ep_speed or (pp_speed == ep_speed and random.random() < 0.5)
        
        if player_first:
            if pp_can_attack and player_action.get("type") == "attack":
                dmg_msg = BattleEngine.execute_attack(pp, ep, player_action["moveId"])
                messages.append(dmg_msg)
            if not BattleEngine.check_end(battle_state) and ep_can_attack:
                dmg_msg = BattleEngine.execute_attack(ep, pp, enemy_action.get("moveId", 1))
                messages.append(dmg_msg)
        else:
            if ep_can_attack:
                dmg_msg = BattleEngine.execute_attack(ep, pp, enemy_action.get("moveId", 1))
                messages.append(dmg_msg)
            if not BattleEngine.check_end(battle_state) and pp_can_attack and player_action.get("type") == "attack":
                dmg_msg = BattleEngine.execute_attack(pp, ep, player_action["moveId"])
                messages.append(dmg_msg)
        
        battle_state["turn"] += 1
        BattleEngine.check_end(battle_state)
        
        return {"messages": messages, "isOver": battle_state["isOver"]}

    @staticmethod
    def execute_attack(attacker: Dict, defender: Dict, move_id: int) -> str:
        move = next((m for m in moves_data if m["id"] == move_id), None)
        if not move:
            return f"{PokemonManager.get_pokemon_name(attacker)}的攻击失败了！"
        
        attacker_name = PokemonManager.get_pokemon_name(attacker)
        defender_name = PokemonManager.get_pokemon_name(defender)
        
        if random.random() * 100 > move.get("accuracy", 100):
            return f"{attacker_name}的{move['name']}没有命中！"
        
        if move.get("category") == "status":
            if move.get("statusEffect") and random.random() < 0.3:
                if move["statusEffect"] not in defender.get("statusEffects", []):
                    defender.setdefault("statusEffects", []).append(move["statusEffect"])
                    status_names = {"poison": "中毒", "burn": "烧伤", "paralysis": "麻痹", "freeze": "冰冻", "sleep": "睡眠"}
                    return f"{attacker_name}使用了{move['name']}！{defender_name}{status_names.get(move['statusEffect'], '异常')}了！"
            return f"{attacker_name}使用了{move['name']}！"
        
        power = move.get("power", 40)
        if move.get("category") == "physical":
            attack_stat = attacker["stats"]["attack"]
            defense_stat = defender["stats"]["defense"]
        else:
            attack_stat = attacker["stats"]["spAttack"]
            defense_stat = defender["stats"]["spDefense"]
        
        damage = int((power * attack_stat / defense_stat) * 0.5) + random.randint(-2, 2)
        damage = max(1, damage)
        
        defender["currentHp"] = max(0, defender["currentHp"] - damage)
        
        return f"{attacker_name}使用了{move['name']}！造成{damage}点伤害！"

    @staticmethod
    def can_act(pokemon: Dict) -> bool:
        for status in pokemon.get("statusEffects", []):
            effect = PokemonManager.get_status_effectiveness(status)
            if not effect["canAttack"]:
                return False
        return True

    @staticmethod
    def check_end(battle_state: Dict) -> bool:
        pp = battle_state["playerPokemon"]
        ep = battle_state["enemyPokemon"]
        
        if pp["currentHp"] <= 0:
            pp["currentHp"] = 0
            battle_state["isOver"] = True
            battle_state["winner"] = "enemy"
            return True
        if ep["currentHp"] <= 0:
            ep["currentHp"] = 0
            battle_state["isOver"] = True
            battle_state["winner"] = "player"
            return True
        return False

    @staticmethod
    def can_catch(battle_state: Dict, ball_bonus: float = 1.0) -> Dict:
        ep = battle_state["enemyPokemon"]
        hp_ratio = ep["currentHp"] / ep["stats"]["hp"] if ep["stats"]["hp"] > 0 else 0
        catch_rate = (1 - hp_ratio) * 100 * ball_bonus
        roll = random.random() * 100
        shakes = min(3, int(catch_rate / 25)) if roll < catch_rate else 0
        return {"success": shakes >= 3, "shakes": shakes}

    @staticmethod
    def get_exp_reward(battle_state: Dict) -> int:
        return battle_state["enemyPokemon"].get("level", 5) * 10


def render_main_menu(session: Dict) -> str:
    player = load_player(session["user_id"], session.get("group_id"))
    save_info = ""
    if player:
        save_info = f"\n存档: {player['name']} (徽章: {player['badges']})"
    return f"""╔════════════════════════╗
║    宝可梦文字冒险      ║
╠════════════════════════╣
║ [1] 新游戏             ║
║ [2] 继续游戏{'           ' if not save_info else ''}{save_info}
║ [3] 退出               ║
╚════════════════════════╝"""

def render_starter_select() -> str:
    return """╔════════════════════════╗
║   选择初始宝可梦       ║
╠════════════════════════╣
║ [1] 小火龙 (火)        ║
║ [2] 杰尼龟 (水)        ║
║ [3] 妙蛙种子 (草)      ║
╚════════════════════════╝"""

def render_location(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location:
        return render_main_menu(session)
    
    pokemon = player["party"][0] if player.get("party") else None
    pokemon_name = PokemonManager.get_pokemon_name(pokemon) if pokemon else "无"
    desc = location.get("description", "")[:36]
    
    options = ["[1] 探索  [2] 移动", "[3] 队伍  [4] 背包", "[5] PC   [6] 存档"]
    opt_num = 7
    if location.get("hasCenter"):
        options.append(f"[{opt_num}] 宝可梦中心")
        opt_num += 1
    if location.get("hasShop"):
        options.append(f"[{opt_num}] 商店")
    
    return f"""╔════════════════════════╗
║ {location['name'][:18]}
╠════════════════════════╣
║ {desc}
╠════════════════════════╣
║ 当前: {pokemon_name} Lv.{pokemon.get('level', 0) if pokemon else 0}
║ 金钱: ${player.get('money', 0)}
╠════════════════════════╣
{chr(10).join('║ ' + o + ' ║' for o in options)}
╚════════════════════════╝"""

def render_battle_menu(session: Dict) -> str:
    battle_state = session.get("battle_state")
    if not battle_state:
        return render_location(session)
    pp = battle_state["playerPokemon"]
    ep = battle_state["enemyPokemon"]
    player_name = PokemonManager.get_pokemon_name(pp)
    enemy_name = PokemonManager.get_pokemon_name(ep)
    player_hp = PokemonManager.get_hp_bar(pp.get("currentHp", 0), pp["stats"].get("hp", 1), 8)
    enemy_hp = PokemonManager.get_hp_bar(ep.get("currentHp", 0), ep["stats"].get("hp", 1), 8)
    
    status_text = ""
    if pp.get("statusEffects"):
        status_names = {"poison": "毒", "burn": "烧", "paralysis": "麻", "freeze": "冻", "sleep": "睡"}
        status_text = " [" + ",".join(status_names.get(s, s) for s in pp["statusEffects"]) + "]"
    
    return f"""╔════════════════════════╗
║ 敌方: {enemy_name} Lv.{ep.get('level', 0)}
║ HP: {enemy_hp} {ep.get('currentHp', 0)}/{ep['stats'].get('hp', '?')}
╠════════════════════════╣
║ 我方: {player_name} Lv.{pp.get('level', 0)}{status_text}
║ HP: {player_hp} {pp.get('currentHp', 0)}/{pp['stats'].get('hp', '?')}
╠════════════════════════╣
║ [1] 攻击  [2] 捕捉     ║
║ [3] 道具  [4] 逃跑     ║
╚════════════════════════╝"""

def render_move_select(session: Dict) -> str:
    battle_state = session.get("battle_state")
    if not battle_state:
        return render_battle_menu(session)
    moves = battle_state["playerPokemon"].get("moves", [])
    move_list = ""
    for i in range(4):
        if i < len(moves):
            move = moves[i]
            move_data = next((m for m in moves_data if m["id"] == move["moveId"]), None)
            move_name = move_data.get("name", "未知") if move_data else "未知"
            padding = ' ' * max(0, 8 - len(move_name))
            move_list += f"║ [{i+1}] {move_name} ({move.get('currentPp', 0)}){padding}║\n"
        else:
            move_list += f"║ [{i+1}] -            ║\n"
    return f"""╔════════════════════════╗
║      选择技能          ║
╠════════════════════════╣
{move_list}║ [0] 返回               ║
╚════════════════════════╝"""

def render_party(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    party_list = ""
    for i, p in enumerate(player.get("party", [])):
        name = PokemonManager.get_pokemon_name(p)
        hp_bar = PokemonManager.get_hp_bar(p.get("currentHp", 0), p["stats"].get("hp", 1), 6)
        status = " [濒死]" if PokemonManager.is_fainted(p) else ""
        nature_info = PokemonManager.get_nature_info(p.get("nature", ''))
        nature_text = f" 性格:{nature_info['name']}" if nature_info.get('name') else ""
        party_list += f"║ {i+1}. {name} Lv.{p.get('level', 0)}{nature_text}\n"
        party_list += f"║    HP:{hp_bar}{status}\n"
    return f"""╔════════════════════════╗
║        队伍            ║
╠════════════════════════╣
{party_list}╚════════════════════════╝

{render_location(session)}"""

def render_inventory(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    inventory = player.get("inventory", [])
    if not inventory:
        return "背包是空的。\n\n" + render_location(session)
    item_list = ""
    for item in inventory:
        item_data = next((it for it in items_data if it["id"] == item.get("itemId")), None)
        if item_data:
            item_list += f"║ {item_data['name']} x{item.get('quantity', 0)}\n"
    return f"""╔════════════════════════╗
║        背包            ║
╠════════════════════════╣
{item_list}╚════════════════════════╝

{render_location(session)}"""

def render_pc(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    lines = ["╔════════════════════════╗", "║      宝可梦电脑        ║", "╠════════════════════════╣"]
    
    has_pokemon = False
    for i, box in enumerate(player.get("pc", [])):
        if box:
            has_pokemon = True
            lines.append(f"║ [盒子{i+1}] ({len(box)}/30)")
            for j, p in enumerate(box[:5]):
                name = PokemonManager.get_pokemon_name(p)
                lines.append(f"║   {j+1}. {name} Lv.{p.get('level', 0)}")
            if len(box) > 5:
                lines.append(f"║   ... 还有{len(box)-5}只")
    
    if not has_pokemon:
        lines.append("║ （空无一物）")
    
    pc_count = PlayerManager.get_pc_count(player)
    lines.append(f"╠════════════════════════╣")
    lines.append(f"║ PC: {pc_count}只 | 队伍: {len(player.get('party', []))}/6")
    lines.append("║ [1] 取出  [2] 存入     ║")
    lines.append("║ [0] 返回               ║")
    lines.append("╚════════════════════════╝")
    
    return "\n".join(lines)

def render_move_location(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location:
        return render_location(session)
    options = ""
    for i, conn_id in enumerate(location.get("connections", [])):
        conn = next((l for l in maps_data if l["id"] == conn_id), None)
        if conn:
            padding = ' ' * max(0, 14 - len(conn["name"]))
            options += f"║ [{i+1}] {conn['name']}{padding}║\n"
    return f"""╔════════════════════════╗
║      选择目的地        ║
╠════════════════════════╣
{options}║ [0] 返回               ║
╚════════════════════════╝"""

def render_shop(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location:
        return render_location(session)
    
    shop_items = location.get("shopItems", [1, 10])
    items_display = ""
    for i, item_id in enumerate(shop_items):
        item = next((it for it in items_data if it["id"] == item_id), None)
        if item:
            items_display += f"║ [{i+1}] {item['name'][:8]} ${item['price']}\n"
    
    return f"""╔════════════════════════╗
║        友好商店        ║
╠════════════════════════╣
║ 金钱: ${player.get('money', 0)}
╠════════════════════════╣
{items_display}╠════════════════════════╣
║ [0] 离开               ║
╚════════════════════════╝"""

def render_pokemon_center(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    needs_healing = any(
        p["currentHp"] < p["stats"]["hp"] or p.get("statusEffects")
        for p in player.get("party", [])
    )
    
    if not needs_healing:
        return """╔════════════════════════╗
║      宝可梦中心       ║
╠════════════════════════╣
║ 你的宝可梦都很健康。  ║
╚════════════════════════╝

""" + render_location(session)
    
    return """╔════════════════════════╗
║      宝可梦中心       ║
╠════════════════════════╣
║ [1] 恢复宝可梦        ║
║ [0] 离开              ║
╚════════════════════════╝"""

def render_item_use(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    usable_items = []
    for item in player.get("inventory", []):
        item_data = next((it for it in items_data if it["id"] == item.get("itemId")), None)
        if item_data and item_data.get("type") == "medicine":
            usable_items.append((item, item_data))
    
    if not usable_items:
        return "没有可使用的道具。\n\n" + render_battle_menu(session)
    
    items_display = ""
    for i, (item, item_data) in enumerate(usable_items):
        items_display += f"║ [{i+1}] {item_data['name'][:8]} x{item['quantity']}\n"
    
    return f"""╔════════════════════════╗
║      使用道具          ║
╠════════════════════════╣
{items_display}║ [0] 返回               ║
╚════════════════════════╝"""

def handle_input(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    scene = session.get("scene", "main_menu")
    handlers = {
        "main_menu": handle_main_menu,
        "starter_select": handle_starter_select,
        "name_input": handle_name_input,
        "location": handle_location,
        "battle": handle_battle_menu,
        "battle_menu": handle_battle_menu,
        "move_select": handle_move_select,
        "move_location": handle_move_location,
        "pc_menu": handle_pc_menu,
        "pc_withdraw": handle_pc_withdraw,
        "pc_deposit": handle_pc_deposit,
        "shop": handle_shop,
        "shop_buy": handle_shop_buy,
        "pokemon_center": handle_pokemon_center,
        "item_use": handle_item_use,
        "item_target": handle_item_target,
    }
    handler = handlers.get(scene, lambda u, m, g: render_main_menu(get_session(u, g)))
    return handler(user_id, message, group_id)

def handle_main_menu(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    choice = message.strip()
    try:
        num = int(choice)
    except ValueError:
        return render_main_menu(get_session(user_id, group_id))
    if num == 1:
        session = get_session(user_id, group_id)
        session["scene"] = "starter_select"
        return render_starter_select()
    elif num == 2:
        player = load_player(user_id, group_id)
        if player:
            session = get_session(user_id, group_id)
            session["player"] = player
            session["scene"] = "location"
            return render_location(session)
        return "没有找到存档，请先开始新游戏！\n\n" + render_main_menu(get_session(user_id, group_id))
    return render_main_menu(get_session(user_id, group_id))

def handle_starter_select(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    try:
        choice = int(message.strip())
    except ValueError:
        return render_starter_select()
    if 1 <= choice <= 3:
        session = get_session(user_id, group_id)
        session["temp_data"]["starterChoice"] = choice - 1
        session["scene"] = "name_input"
        return "请输入你的名字："
    return render_starter_select()

def handle_name_input(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    name = message.strip() or "训练家"
    session = get_session(user_id, group_id)
    starter_index = session.get("temp_data", {}).get("starterChoice", 0)
    player = PlayerManager.create_player(name, starter_index)
    session["player"] = player
    session["scene"] = "location"
    save_player(user_id, player, group_id)
    starter = player["party"][0] if player.get("party") else None
    starter_name = PokemonManager.get_pokemon_name(starter) if starter else "未知"
    return f"欢迎，{name}！\n你获得了 {starter_name}！\n\n" + render_location(session)

def handle_location(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    try:
        choice = int(message.strip())
    except ValueError:
        return render_location(session)
    
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location:
        return render_location(session)
    
    if choice == 1:
        return handle_explore(session)
    elif choice == 2:
        session["scene"] = "move_location"
        return render_move_location(session)
    elif choice == 3:
        return render_party(session)
    elif choice == 4:
        return render_inventory(session)
    elif choice == 5:
        session["scene"] = "pc_menu"
        return render_pc(session)
    elif choice == 6:
        save_player(user_id, player, group_id)
        return "游戏已保存！\n\n" + render_location(session)
    else:
        opt_num = 7
        if location.get("hasCenter"):
            if choice == opt_num:
                session["scene"] = "pokemon_center"
                return render_pokemon_center(session)
            opt_num += 1
        if location.get("hasShop"):
            if choice == opt_num:
                session["scene"] = "shop"
                return render_shop(session)
    
    return render_location(session)

def handle_explore(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location or not location.get("wildPokemon"):
        return "这里没有野生宝可梦...\n\n" + render_location(session)
    
    roll = random.random()
    if roll < 0.35:
        encounter = select_wild_encounter(location["wildPokemon"])
        if encounter:
            return start_wild_battle(session, encounter)
    elif roll < 0.42:
        found_items = [
            {"id": 10, "name": "伤药", "qty": random.randint(1, 3)},
            {"id": 1, "name": "精灵球", "qty": random.randint(1, 2)},
        ]
        item = random.choice(found_items)
        PlayerManager.add_item(player, item["id"], item["qty"])
        save_player(session["user_id"], player, session.get("group_id"))
        return f"你在草丛中发现了 {item['qty']} 个{item['name']}！\n\n" + render_location(session)
    elif roll < 0.55:
        trainer_pokemon = PokemonManager.create_pokemon(
            random.choice([10, 16, 19, 21]),
            random.randint(3, 6)
        )
        if trainer_pokemon:
            return start_trainer_battle(session, trainer_pokemon)
    
    return "你在草丛中探索，但没有发现宝可梦。\n\n" + render_location(session)

def select_wild_encounter(encounters: List[Dict]) -> Optional[Dict]:
    roll = random.random()
    cumulative = 0
    for enc in encounters:
        cumulative += enc.get("rate", 0)
        if roll < cumulative:
            return enc
    return encounters[0] if encounters else None

def start_wild_battle(session: Dict, encounter: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    party = player.get("party", [])
    first_healthy = next((p for p in party if not PokemonManager.is_fainted(p)), None)
    if not first_healthy:
        return "你没有可以战斗的宝可梦！\n\n" + render_location(session)
    min_lv = encounter.get("minLevel", 3)
    max_lv = encounter.get("maxLevel", 5)
    level = min_lv + random.randint(0, max(0, max_lv - min_lv))
    enemy = PokemonManager.create_pokemon(encounter.get("pokemonId", 1), level)
    if not enemy:
        return render_location(session)
    battle_state = BattleEngine.create_battle(first_healthy, enemy, "wild")
    session["battle_state"] = battle_state
    session["temp_data"]["encounter"] = encounter
    session["scene"] = "battle_menu"
    enemy_name = PokemonManager.get_pokemon_name(enemy)
    return f"野生的 {enemy_name} (Lv.{level}) 出现了！\n\n" + render_battle_menu(session)

def start_trainer_battle(session: Dict, enemy_pokemon: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    first_healthy = PlayerManager.get_first_healthy(player)
    if not first_healthy:
        return "你没有可以战斗的宝可梦！\n\n" + render_location(session)
    
    battle_state = BattleEngine.create_battle(first_healthy, enemy_pokemon, "trainer")
    session["battle_state"] = battle_state
    session["scene"] = "battle_menu"
    enemy_name = PokemonManager.get_pokemon_name(enemy_pokemon)
    return f"野生训练家出现了！\n敌方: {enemy_name} Lv.{enemy_pokemon['level']}\n\n" + render_battle_menu(session)

def handle_battle_menu(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    battle_state = session.get("battle_state")
    if not battle_state or not session.get("player"):
        session["scene"] = "location"
        return render_location(session)
    try:
        choice = int(message.strip())
    except ValueError:
        return render_battle_menu(session)
    if choice == 1:
        session["scene"] = "move_select"
        return render_move_select(session)
    elif choice == 2:
        return use_ball(session)
    elif choice == 3:
        session["scene"] = "item_use"
        return render_item_use(session)
    elif choice == 4:
        return run_from_battle(session)
    return render_battle_menu(session)

def handle_move_select(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    battle_state = session.get("battle_state")
    if not battle_state or not session.get("player"):
        session["scene"] = "location"
        return render_location(session)
    try:
        choice = int(message.strip())
    except ValueError:
        return render_move_select(session)
    if choice == 0:
        session["scene"] = "battle_menu"
        return render_battle_menu(session)
    moves = battle_state["playerPokemon"].get("moves", [])
    if 1 <= choice <= len(moves):
        player_action = {"type": "attack", "moveId": moves[choice - 1]["moveId"]}
        return execute_turn(session, player_action)
    return render_move_select(session)

def use_ball(session: Dict) -> str:
    battle_state = session.get("battle_state")
    player = session.get("player")
    if not battle_state or not player:
        session["scene"] = "location"
        return render_location(session)
    
    ball_item = next((item for item in player.get("inventory", []) if item.get("itemId") == 1), None)
    if not ball_item or ball_item.get("quantity", 0) <= 0:
        return "你没有精灵球了！\n\n" + render_battle_menu(session)
    
    ball_item["quantity"] -= 1
    if ball_item["quantity"] <= 0:
        player["inventory"].remove(ball_item)
    
    result = BattleEngine.can_catch(battle_state, 1.0)
    if result["success"]:
        enemy_name = PokemonManager.get_pokemon_name(battle_state["enemyPokemon"])
        add_result = PlayerManager.add_pokemon(player, battle_state["enemyPokemon"])
        session["battle_state"] = None
        session["scene"] = "location"
        save_player(session["user_id"], player, session.get("group_id"))
        return f"摇晃了{result['shakes']}次...\n捕捉成功！\n{enemy_name} {add_result['message']}\n\n" + render_location(session)
    
    enemy_action = BattleEngine.get_enemy_action(battle_state)
    BattleEngine.execute_turn(battle_state, {"type": "wait"}, enemy_action)
    msg = f"摇晃了{result['shakes']}次...\n捕捉失败！\n\n"
    
    if battle_state.get("isOver"):
        sync_player_pokemon(session)
        session["battle_state"] = None
        session["scene"] = "location"
        save_player(session["user_id"], player, session.get("group_id"))
        if battle_state.get("winner") == "enemy":
            return msg + "你的宝可梦倒下了...\n\n" + render_location(session)
        return msg + render_location(session)
    
    session["scene"] = "battle_menu"
    return msg + render_battle_menu(session)

def run_from_battle(session: Dict) -> str:
    battle_state = session.get("battle_state")
    if not battle_state:
        session["scene"] = "location"
        return render_location(session)
    if battle_state.get("type") == "wild":
        if random.random() < 0.5:
            session["battle_state"] = None
            session["scene"] = "location"
            return "成功逃跑了！\n\n" + render_location(session)
        enemy_action = BattleEngine.get_enemy_action(battle_state)
        BattleEngine.execute_turn(battle_state, {"type": "run"}, enemy_action)
        
        if battle_state.get("isOver"):
            sync_player_pokemon(session)
            session["battle_state"] = None
            session["scene"] = "location"
            return "逃跑失败！你的宝可梦倒下了...\n\n" + render_location(session)
        
        return "逃跑失败！\n\n" + render_battle_menu(session)
    return "训练家战斗中无法逃跑！\n\n" + render_battle_menu(session)

def execute_turn(session: Dict, player_action: Dict) -> str:
    battle_state = session.get("battle_state")
    player = session.get("player")
    if not battle_state or not player:
        session["scene"] = "location"
        return render_location(session)
    
    enemy_action = BattleEngine.get_enemy_action(battle_state)
    result = BattleEngine.execute_turn(battle_state, player_action, enemy_action)
    
    messages = result.get("messages", [])
    msg = "\n".join(messages) + "\n"
    
    if battle_state.get("isOver"):
        if battle_state.get("winner") == "player":
            exp = BattleEngine.get_exp_reward(battle_state)
            alive_party = [p for p in player.get("party", []) if not PokemonManager.is_fainted(p)]
            exp_each = exp // max(1, len(alive_party))
            
            exp_messages = []
            for p in alive_party:
                gain_result = PokemonManager.gain_exp(p, exp_each)
                exp_messages.extend(gain_result["messages"])
            
            money_reward = random.randint(20, 100)
            PlayerManager.add_money(player, money_reward)
            msg += f"\n战斗胜利！获得 {exp} 经验值！\n"
            msg += "\n".join(exp_messages) + "\n"
            msg += f"获得 ${money_reward}\n"
        else:
            msg += "\n战斗失败...\n"
        
        sync_player_pokemon(session)
        session["battle_state"] = None
        session["scene"] = "location"
        save_player(session["user_id"], player, session.get("group_id"))
        return msg + "\n" + render_location(session)
    
    session["scene"] = "battle_menu"
    return msg + "\n" + render_battle_menu(session)

def sync_player_pokemon(session: Dict):
    battle_state = session.get("battle_state")
    player = session.get("player")
    if not battle_state or not player:
        return
    pp = battle_state["playerPokemon"]
    party = player.get("party", [])
    for i, p in enumerate(party):
        if p.get("baseId") == pp.get("baseId"):
            party[i] = pp
            break

def handle_move_location(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location:
        return render_location(session)
    connections = location.get("connections", [])
    try:
        choice = int(message.strip())
    except ValueError:
        return render_move_location(session)
    if choice == 0 or choice > len(connections):
        session["scene"] = "location"
        return render_location(session)
    if 1 <= choice <= len(connections):
        player["currentLocation"] = connections[choice - 1]
        session["scene"] = "location"
        save_player(session["user_id"], player, group_id)
        new_loc = next((l for l in maps_data if l["id"] == player["currentLocation"]), None)
        return f"移动成功！\n到达了 {new_loc['name'] if new_loc else '未知地点'}\n\n" + render_location(session)
    return render_move_location(session)

def handle_pc_menu(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_pc(session)
    
    if choice == 0:
        session["scene"] = "location"
        return render_location(session)
    elif choice == 1:
        if player["party"].length >= 6 if hasattr(player["party"], 'length') else len(player["party"]) >= 6:
            return "队伍已满！请先存入一只宝可梦。\n\n" + render_pc(session)
        session["scene"] = "pc_withdraw"
        return render_pc_withdraw(session)
    elif choice == 2:
        if len(player["party"]) <= 1:
            return "至少保留一只宝可梦在队伍中！\n\n" + render_pc(session)
        session["scene"] = "pc_deposit"
        return render_pc_deposit(session)
    
    return render_pc(session)

def render_pc_withdraw(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    lines = ["╔════════════════════════╗", "║      取出宝可梦        ║", "╠════════════════════════╣"]
    
    box_num = 0
    for i, box in enumerate(player.get("pc", [])):
        if box:
            box_num = i + 1
            lines.append(f"║ [盒子{box_num}] ({len(box)}/30)")
            for j, p in enumerate(box):
                name = PokemonManager.get_pokemon_name(p)
                lines.append(f"║   [{j+1}] {name} Lv.{p.get('level', 0)}")
            break
    
    if box_num == 0:
        lines.append("║ 电脑中没有宝可梦。")
    
    lines.append("║ [0] 返回               ║")
    lines.append("╚════════════════════════╝")
    
    session["temp_data"]["withdrawBox"] = box_num - 1 if box_num > 0 else -1
    
    return "\n".join(lines)

def render_pc_deposit(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    lines = ["╔════════════════════════╗", "║      存入宝可梦        ║", "╠════════════════════════╣"]
    
    for i, p in enumerate(player.get("party", [])):
        name = PokemonManager.get_pokemon_name(p)
        status = " [濒死]" if PokemonManager.is_fainted(p) else ""
        lines.append(f"║ [{i+1}] {name} Lv.{p.get('level', 0)}{status}")
    
    lines.append("║ [0] 返回               ║")
    lines.append("╚════════════════════════╝")
    
    return "\n".join(lines)

def handle_pc_withdraw(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_pc_withdraw(session)
    
    if choice == 0:
        session["scene"] = "pc_menu"
        return render_pc(session)
    
    if len(player["party"]) >= 6:
        return "队伍已满！\n\n" + render_pc(session)
    
    box_idx = session.get("temp_data", {}).get("withdrawBox", -1)
    if box_idx < 0 or box_idx >= len(player["pc"]):
        return "无效的盒子。\n\n" + render_pc(session)
    
    box = player["pc"][box_idx]
    if choice < 1 or choice > len(box):
        return render_pc_withdraw(session)
    
    pokemon = box.pop(choice - 1)
    player["party"].append(pokemon)
    save_player(user_id, player, group_id)
    
    name = PokemonManager.get_pokemon_name(pokemon)
    session["scene"] = "pc_menu"
    return f"{name} 已从盒子{box_idx + 1}取出到队伍！\n\n" + render_pc(session)

def handle_pc_deposit(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_pc_deposit(session)
    
    if choice == 0:
        session["scene"] = "pc_menu"
        return render_pc(session)
    
    if choice < 1 or choice > len(player["party"]):
        return render_pc_deposit(session)
    
    if len(player["party"]) <= 1:
        return "至少保留一只宝可梦在队伍中！\n\n" + render_pc_deposit(session)
    
    pokemon = player["party"].pop(choice - 1)
    
    deposited = False
    for i, box in enumerate(player["pc"]):
        if len(box) < 30:
            box.append(pokemon)
            deposited = True
            name = PokemonManager.get_pokemon_name(pokemon)
            save_player(user_id, player, group_id)
            session["scene"] = "pc_menu"
            return f"{name} 已存入盒子{i + 1}！\n\n" + render_pc(session)
    
    player["party"].insert(choice - 1, pokemon)
    return "电脑已满！\n\n" + render_pc(session)

def handle_shop(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location:
        return render_location(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_shop(session)
    
    if choice == 0:
        session["scene"] = "location"
        return render_location(session)
    
    shop_items = location.get("shopItems", [1, 10])
    if choice < 1 or choice > len(shop_items):
        return render_shop(session)
    
    item_id = shop_items[choice - 1]
    item = next((it for it in items_data if it["id"] == item_id), None)
    if not item:
        return render_shop(session)
    
    session["temp_data"]["buyItem"] = item_id
    session["scene"] = "shop_buy"
    
    return f"""╔════════════════════════╗
║ {item['name']}
║ ${item['price']} - {item['description'][:18]}
╠════════════════════════╣
║ 金钱: ${player.get('money', 0)}
║ [1] x1  [2] x5  [3] x10
║ [0] 取消
╚════════════════════════╝"""

def handle_shop_buy(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_shop(session)
    
    if choice == 0:
        session["scene"] = "shop"
        return render_shop(session)
    
    quantities = {1: 1, 2: 5, 3: 10}
    qty = quantities.get(choice, 1)
    
    item_id = session.get("temp_data", {}).get("buyItem")
    if not item_id:
        session["scene"] = "shop"
        return render_shop(session)
    
    item = next((it for it in items_data if it["id"] == item_id), None)
    if not item:
        session["scene"] = "shop"
        return render_shop(session)
    
    total = item["price"] * qty
    if player["money"] < total:
        return f"金钱不足！需要 ${total}\n\n" + render_shop(session)
    
    PlayerManager.remove_money(player, total)
    PlayerManager.add_item(player, item_id, qty)
    save_player(user_id, player, group_id)
    
    session["scene"] = "shop"
    return f"购买成功！+{qty} {item['name']}\n剩余: ${player['money']}\n\n" + render_shop(session)

def handle_pokemon_center(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_pokemon_center(session)
    
    if choice == 0:
        session["scene"] = "location"
        return render_location(session)
    
    if choice == 1:
        PlayerManager.heal_all_pokemon(player)
        save_player(user_id, player, group_id)
        
        result = "恢复中...\n\n✓ 所有宝可梦已完全恢复！\n"
        for i, p in enumerate(player["party"]):
            name = PokemonManager.get_pokemon_name(p)
            result += f"  {i+1}. {name} HP:{p['stats']['hp']}/{p['stats']['hp']}\n"
        
        return result + "\n" + render_location(session)
    
    return render_pokemon_center(session)

def handle_item_use(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    battle_state = session.get("battle_state")
    
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        return render_item_use(session)
    
    if choice == 0:
        if battle_state:
            session["scene"] = "battle_menu"
            return render_battle_menu(session)
        session["scene"] = "location"
        return render_location(session)
    
    usable_items = []
    for item in player.get("inventory", []):
        item_data = next((it for it in items_data if it["id"] == item.get("itemId")), None)
        if item_data and item_data.get("type") == "medicine":
            usable_items.append((item, item_data))
    
    if choice < 1 or choice > len(usable_items):
        return render_item_use(session)
    
    item, item_data = usable_items[choice - 1]
    session["temp_data"]["useItem"] = item["itemId"]
    session["scene"] = "item_target"
    
    targetable = []
    for i, p in enumerate(player.get("party", [])):
        if item_data.get("revive") and PokemonManager.is_fainted(p):
            targetable.append((i, p))
        elif item_data.get("healHp") and not PokemonManager.is_fainted(p) and p["currentHp"] < p["stats"]["hp"]:
            targetable.append((i, p))
        elif item_data.get("cureStatus") and item_data["cureStatus"] in p.get("statusEffects", []):
            targetable.append((i, p))
    
    if not targetable:
        return "没有可以使用该道具的宝可梦。\n\n" + render_item_use(session)
    
    lines = ["╔════════════════════════╗", "║      选择目标          ║", "╠════════════════════════╣"]
    for i, (idx, p) in enumerate(targetable):
        name = PokemonManager.get_pokemon_name(p)
        status = " [濒死]" if PokemonManager.is_fainted(p) else ""
        lines.append(f"║ [{i+1}] {name} Lv.{p.get('level', 0)}{status}")
    lines.append("║ [0] 取消               ║")
    lines.append("╚════════════════════════╝")
    
    session["temp_data"]["itemTargets"] = [t[0] for t in targetable]
    
    return "\n".join(lines)

def handle_item_target(user_id: str, message: str, group_id: Optional[str] = None) -> str:
    session = get_session(user_id, group_id)
    player = session.get("player")
    battle_state = session.get("battle_state")
    
    if not player:
        return render_main_menu(session)
    
    try:
        choice = int(message.strip())
    except ValueError:
        session["scene"] = "item_use"
        return render_item_use(session)
    
    if choice == 0:
        session["scene"] = "item_use"
        return render_item_use(session)
    
    targets = session.get("temp_data", {}).get("itemTargets", [])
    if choice < 1 or choice > len(targets):
        return handle_item_use(user_id, message, group_id)
    
    party_idx = targets[choice - 1]
    pokemon = player["party"][party_idx]
    item_id = session.get("temp_data", {}).get("useItem")
    item_data = next((it for it in items_data if it["id"] == item_id), None)
    
    if not item_data:
        session["scene"] = "item_use"
        return render_item_use(session)
    
    PlayerManager.remove_item(player, item_id, 1)
    name = PokemonManager.get_pokemon_name(pokemon)
    result_msg = f"对 {name} 使用了 {item_data['name']}！\n"
    
    if item_data.get("revive"):
        heal_amount = pokemon["stats"]["hp"] // 2
        pokemon["currentHp"] = heal_amount
        pokemon["statusEffects"] = []
        result_msg += f"{name} 复活了！HP恢复到 {heal_amount}"
    elif item_data.get("healHp"):
        heal_amount = min(item_data["healHp"], pokemon["stats"]["hp"] - pokemon["currentHp"])
        pokemon["currentHp"] += heal_amount
        result_msg += f"{name} 恢复了 {heal_amount} HP！当前: {pokemon['currentHp']}/{pokemon['stats']['hp']}"
    elif item_data.get("cureStatus"):
        status = item_data["cureStatus"]
        if status in pokemon.get("statusEffects", []):
            pokemon["statusEffects"].remove(status)
            status_names = {"poison": "中毒", "burn": "烧伤", "paralysis": "麻痹", "freeze": "冰冻", "sleep": "睡眠"}
            result_msg += f"{name} 的{status_names.get(status, status)}被治愈了！"
    
    save_player(user_id, player, group_id)
    
    if battle_state:
        session["scene"] = "battle_menu"
        return result_msg + "\n\n" + render_battle_menu(session)
    
    session["scene"] = "location"
    return result_msg + "\n\n" + render_location(session)


start_cmd = on_command("开始", aliases={"游戏", "菜单"}, priority=10, block=True)
help_cmd = on_command("帮助", aliases={"help"}, priority=10, block=True)
status_cmd = on_command("状态", priority=10, block=True)
pc_cmd = on_command("pc", aliases={"电脑", "PC"}, priority=10, block=True)

@start_cmd.handle()
async def handle_start(bot: Bot, event: MessageEvent, args: Message = CommandArg()):
    user_id = str(event.user_id)
    group_id = str(event.group_id) if isinstance(event, GroupMessageEvent) else None
    response = handle_input(user_id, "", group_id)
    await start_cmd.finish(response)

@help_cmd.handle()
async def handle_help(bot: Bot, event: MessageEvent):
    await help_cmd.finish("""╔════════════════════════╗
║     宝可梦文字冒险     ║
╠════════════════════════╣
║ 指令列表:              ║
║ !开始 - 开始游戏       ║
║ !状态 - 查看状态       ║
║ !pc - 打开电脑         ║
║ !帮助 - 显示帮助       ║
╠════════════════════════╣
║ 游戏中直接输入数字选择 ║
╚════════════════════════╝""")

@status_cmd.handle()
async def handle_status(bot: Bot, event: MessageEvent):
    user_id = str(event.user_id)
    group_id = str(event.group_id) if isinstance(event, GroupMessageEvent) else None
    player = load_player(user_id, group_id)
    if not player:
        await status_cmd.finish("你还没有开始游戏！\n发送 !开始 开始冒险吧！")
    
    pokemon = player.get("party", [None])[0]
    pokemon_name = PokemonManager.get_pokemon_name(pokemon) if pokemon else "无"
    pc_count = PlayerManager.get_pc_count(player)
    
    await status_cmd.finish(f"""╔════════════════════════╗
║      玩家状态          ║
╠════════════════════════╣
║ 名字: {player.get('name', '?')}
║ 徽章: {player.get('badges', 0)}
║ 金钱: ${player.get('money', 0)}
║ 队伍: {len(player.get('party', []))}/6
║ PC: {pc_count}只
║ 首发: {pokemon_name} Lv.{pokemon.get('level', 0) if pokemon else 0}
╚════════════════════════╝""")

@pc_cmd.handle()
async def handle_pc(bot: Bot, event: MessageEvent):
    user_id = str(event.user_id)
    group_id = str(event.group_id) if isinstance(event, GroupMessageEvent) else None
    player = load_player(user_id, group_id)
    if not player:
        await pc_cmd.finish("你还没有开始游戏！\n发送 !开始 开始冒险吧！")
    
    session = get_session(user_id, group_id)
    session["player"] = player
    session["scene"] = "pc_menu"
    await pc_cmd.finish(render_pc(session))

game_input = on_message(priority=5, block=True)

@game_input.handle()
async def handle_game_input(bot: Bot, event: MessageEvent):
    message = event.get_plain_text().strip()
    if not message or message.startswith(("!", "/")):
        return
    user_id = str(event.user_id)
    group_id = str(event.group_id) if isinstance(event, GroupMessageEvent) else None
    session = get_session(user_id, group_id)
    if session.get("scene") == "main_menu":
        return
    response = handle_input(user_id, message, group_id)
    if response:
        await game_input.finish(response)
