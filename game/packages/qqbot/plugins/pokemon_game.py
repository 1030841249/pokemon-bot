import json
import random
from pathlib import Path
from typing import Optional, Dict, List, Any

from nonebot import on_command, on_message, get_driver
from nonebot.adapters.onebot.v11 import (
    Bot,
    MessageEvent,
    GroupMessageEvent,
    PrivateMessageEvent,
    Message,
)
from nonebot.params import CommandArg
from nonebot.rule import to_me

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
    def get_pokemon_name(pokemon: Dict) -> str:
        if not pokemon:
            return "无"
        pkmn = next(
            (p for p in pokemon_data if p["id"] == pokemon.get("baseId")),
            None,
        )
        return pkmn["name"] if pkmn else f"未知#{pokemon.get('baseId', '?')}"

    @staticmethod
    def create_pokemon(pokemon_id: int, level: int = 5) -> Optional[Dict]:
        pkmn = next((p for p in pokemon_data if p["id"] == pokemon_id), None)
        if not pkmn:
            return None
        base_stats = pkmn["baseStats"]
        iv = [random.randint(0, 31) for _ in range(6)]
        stats = {
            "hp": int(base_stats["hp"] * 2 + iv[0]),
            "attack": int(base_stats["attack"] * 2 + iv[1]),
            "defense": int(base_stats["defense"] * 2 + iv[2]),
            "spAttack": int(base_stats["spAttack"] * 2 + iv[3]),
            "spDefense": int(base_stats["spDefense"] * 2 + iv[4]),
            "speed": int(base_stats["speed"] * 2 + iv[5]),
        }
        hp = stats["hp"]
        moves = []
        for mid in pkmn.get("learnset", [])[:4]:
            moves.append({"moveId": mid, "currentPp": 20})
        return {
            "baseId": pokemon_id,
            "level": level,
            "exp": 0,
            "currentHp": hp,
            "stats": stats,
            "moves": moves,
            "status": None,
        }

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
            "currentLocation": 1,
            "party": [starter] if starter else [],
            "inventory": [{"itemId": 1, "quantity": 5}],
        }

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
    def execute_turn(battle_state: Dict, player_action: Dict, enemy_action: Dict):
        pp = battle_state["playerPokemon"]
        ep = battle_state["enemyPokemon"]
        if player_action.get("type") == "attack":
            damage = int(pp["stats"]["attack"] * 0.5 - ep["stats"]["defense"] * 0.25)
            damage = max(1, damage + random.randint(-2, 2))
            ep["currentHp"] -= damage
            battle_state["log"].append({
                "message": f"{PokemonManager.get_pokemon_name(pp)}造成了{damage}点伤害！",
            })
        if enemy_action.get("type") == "attack":
            damage = int(ep["stats"]["attack"] * 0.5 - pp["stats"]["defense"] * 0.25)
            damage = max(1, damage + random.randint(-2, 2))
            pp["currentHp"] -= damage
            battle_state["log"].append({
                "message": f"{PokemonManager.get_pokemon_name(ep)}造成了{damage}点伤害！",
            })
        battle_state["turn"] += 1
        if pp["currentHp"] <= 0:
            pp["currentHp"] = 0
            battle_state["isOver"] = True
            battle_state["winner"] = "enemy"
        elif ep["currentHp"] <= 0:
            ep["currentHp"] = 0
            battle_state["isOver"] = True
            battle_state["winner"] = "player"

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
    desc = location.get("description", "")
    return f"""╔════════════════════════╗
║ {location['name'][:18]}
╠════════════════════════╣
║ {desc[:18]}
║ {desc[18:] or ''}
╠════════════════════════╣
║ 当前: {pokemon_name} Lv.{pokemon.get('level', 0) if pokemon else 0}
╠════════════════════════╣
║ [1] 探索  [2] 移动     ║
║ [3] 队伍  [4] 背包     ║
║ [5] 存档               ║
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
    return f"""╔════════════════════════╗
║ 敌方: {enemy_name} Lv.{ep.get('level', 0)}
║ HP: {enemy_hp} {ep.get('currentHp', 0)}/{ep['stats'].get('hp', '?')}
╠════════════════════════╣
║ 我方: {player_name} Lv.{pp.get('level', 0)}
║ HP: {player_hp} {pp.get('currentHp', 0)}/{pp['stats'].get('hp', '?')}
╠════════════════════════╣
║ [1] 攻击  [2] 捕捉     ║
║ [3] 逃跑               ║
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
        party_list += f"║ {i+1}. {name} Lv.{p.get('level', 0)}\n║    HP:{hp_bar}{status}\n"
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
        save_player(user_id, player, group_id)
        return "游戏已保存！\n\n" + render_location(session)
    return render_location(session)

def handle_explore(session: Dict) -> str:
    player = session.get("player")
    if not player:
        return render_main_menu(session)
    location = next((l for l in maps_data if l["id"] == player.get("currentLocation")), None)
    if not location or not location.get("wildPokemon"):
        return "这里没有野生宝可梦...\n\n" + render_location(session)
    if random.random() < 0.4:
        encounter = select_wild_encounter(location["wildPokemon"])
        if encounter:
            return start_wild_battle(session, encounter)
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
        player.setdefault("party", []).append(battle_state["enemyPokemon"])
        session["battle_state"] = None
        session["scene"] = "location"
        save_player(session["user_id"], player, session.get("group_id"))
        return f"摇晃了{result['shakes']}次...\n捕捉成功！\n{enemy_name} 加入了你的队伍！\n\n" + render_location(session)
    enemy_action = BattleEngine.get_enemy_action(battle_state)
    BattleEngine.execute_turn(battle_state, {"type": "wait"}, enemy_action)
    msg = f"摇晃了{result['shakes']}次...\n捕捉失败！\n\n"
    msg += "\n".join(log["message"] for log in battle_state.get("log", [])[-3:])
    msg += "\n" + render_battle_menu(session)
    return msg

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
        return "逃跑失败！\n\n" + render_battle_menu(session)
    return "训练家战斗中无法逃跑！\n\n" + render_battle_menu(session)

def execute_turn(session: Dict, player_action: Dict) -> str:
    battle_state = session.get("battle_state")
    player = session.get("player")
    if not battle_state or not player:
        session["scene"] = "location"
        return render_location(session)
    enemy_action = BattleEngine.get_enemy_action(battle_state)
    BattleEngine.execute_turn(battle_state, player_action, enemy_action)
    result = "\n".join(log["message"] for log in battle_state.get("log", [])[-3:])
    if battle_state.get("isOver"):
        if battle_state.get("winner") == "player":
            exp = BattleEngine.get_exp_reward(battle_state)
            party = player.get("party", [])
            if party:
                party[0]["exp"] = party[0].get("exp", 0) + exp
            result += f"\n战斗胜利！获得 {exp} 经验值！"
        else:
            result += "\n战斗失败..."
        sync_player_pokemon(session)
        session["battle_state"] = None
        session["scene"] = "location"
        save_player(session["user_id"], player, session.get("group_id"))
        return result + "\n\n" + render_location(session)
    session["scene"] = "battle_menu"
    return result + "\n" + render_battle_menu(session)

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
        return "移动成功！\n\n" + render_location(session)
    return render_move_location(session)

# ========== NoneBot2 命令注册 ==========

start_cmd = on_command("开始", aliases={"游戏", "菜单"}, priority=10, block=True)
help_cmd = on_command("帮助", aliases={"help"}, priority=10, block=True)
status_cmd = on_command("状态", priority=10, block=True)

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
    await status_cmd.finish(f"""╔════════════════════════╗
║      玩家状态          ║
╠════════════════════════╣
║ 名字: {player.get('name', '?')}
║ 徽章: {player.get('badges', 0)}
║ 金钱: {player.get('money', 0)}
║ 队伍: {len(player.get('party', []))}/6
║ 首发: {pokemon_name} Lv.{pokemon.get('level', 0) if pokemon else 0}
╚════════════════════════╝""")

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
