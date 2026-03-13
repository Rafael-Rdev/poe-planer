import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url_en = "https://www.pathofexile.com/api/trade/data/static"
url_de = "https://de.pathofexile.com/api/trade/data/static"

req_en = urllib.request.Request(url_en, headers={'User-Agent': 'Mozilla/5.0'})
req_de = urllib.request.Request(url_de, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req_en, context=ctx) as response:
        data_en = json.loads(response.read().decode())
    with urllib.request.urlopen(req_de, context=ctx) as response:
        data_de = json.loads(response.read().decode())
        
    gems_en = {}
    for cat in data_en['result']:
        for entry in cat['entries']:
            gems_en[entry['id']] = entry['text']
            
    gems_de = {}
    for cat in data_de['result']:
        for entry in cat['entries']:
            gems_de[entry['id']] = entry['text']
            
    my_gems = [
        "Rolling Magma", "Arcane Surge", "Flame Wall", "Elemental Proliferation",
        "Frostblink", "Holy Flame Totem", "Summon Phantasm", "Combustion",
        "Righteous Fire", "Fire Trap", "Efficacy", "Elemental Focus",
        "Swift Affliction", "Trap and Mine Damage", "Burning Damage",
        "Vitality", "Purity of Elements", "Herald of Thunder", "Flammability", "Lifetap",
        "Shield Charge", "Punishment", "Enduring Cry", "Summon Skitterbots", "Unbound Ailments",
        "Flesh and Stone", "Tempest Shield", "Purity of Fire"
    ]
    
    print("EN -> DE Mapping:")
    for gem in my_gems:
        found = False
        for k, v in gems_en.items():
            if gem == v.replace(" Support", ""):
                print(f"{gem} -> {gems_de.get(k, 'NOT FOUND').replace(' Unterstützung', '')}")
                found = True
                break
        if not found:
            for k, v in gems_en.items():
                if gem in v.replace(" Support", ""):
                    print(f"{gem} -> {gems_de.get(k, 'NOT FOUND').replace(' Unterstützung', '')}")
                    found = True
                    break
        if not found:
            print(f"{gem} -> ???")
            
except Exception as e:
    print("Error:", e)
