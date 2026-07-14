#!/usr/bin/env python3
import os
import sys
import re
import json
import urllib.request
import urllib.parse
import subprocess
import tempfile
import shutil
import argparse
from http.server import SimpleHTTPRequestHandler, HTTPServer
import webbrowser

# Ensure we're running Python 3
if sys.version_info[0] < 3:
    print("This script requires Python 3.")
    sys.exit(1)

# Helper function to parse Valve Data Format (VDF / ACF)
def parse_vdf(text):
    text = re.sub(r'//.*', '', text)
    tokens = re.findall(r'"[^"]*"|[{}](?=\s|$|\n)', text)
    tokens = [t.strip('"') for t in tokens]
    
    def build_tree(token_list, idx):
        result = {}
        while idx < len(token_list):
            token = token_list[idx]
            if token == "}":
                return result, idx + 1
            elif token == "{":
                idx += 1
                continue
            else:
                key = token
                idx += 1
                if idx < len(token_list):
                    next_token = token_list[idx]
                    if next_token == "{":
                        val, next_idx = build_tree(token_list, idx + 1)
                        result[key] = val
                        idx = next_idx
                    else:
                        result[key] = next_token
                        idx += 1
        return result, idx

    data, _ = build_tree(tokens, 0)
    return data

# Find Steam library folders cross-platform (Windows & Linux)
def find_steam_libraries():
    libraries = []
    
    # 1. Windows specific search via Registry
    if sys.platform == "win32":
        try:
            import winreg
            # Look up HKEY_CURRENT_USER first
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
                steam_path, _ = winreg.QueryValueEx(key, "SteamPath")
                winreg.CloseKey(key)
                if steam_path:
                    libraries.append(os.path.normpath(os.path.join(steam_path, "steamapps")))
            except Exception:
                pass
                
            # Look up HKEY_LOCAL_MACHINE (Wow6432Node)
            if not libraries:
                try:
                    key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"Software\Wow6432Node\Valve\Steam")
                    steam_path, _ = winreg.QueryValueEx(key, "InstallPath")
                    winreg.CloseKey(key)
                    if steam_path:
                        libraries.append(os.path.normpath(os.path.join(steam_path, "steamapps")))
                except Exception:
                    pass
        except ImportError:
            pass
            
        # Common default paths on Windows if registry queries fail
        fallback_paths = [
            r"C:\Program Files (x86)\Steam\steamapps",
            r"C:\Program Files\Steam\steamapps"
        ]
        for path in fallback_paths:
            if os.path.isdir(path) and path not in libraries:
                libraries.append(path)
                
    else:
        # 2. Linux specific paths
        home = os.path.expanduser("~")
        possible_paths = [
            os.path.join(home, ".steam/steam/steamapps"),
            os.path.join(home, ".local/share/Steam/steamapps"),
            os.path.join(home, ".var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps"),
            os.path.join(home, ".var/app/com.valvesoftware.Steam/data/Steam/steamapps"),
        ]
        for path in possible_paths:
            if os.path.isdir(path):
                libraries.append(path)
                
    # 3. Read libraryfolders.vdf from detected libraries to parse custom libraries
    vdf_libraries = []
    for path in libraries:
        vdf_path = os.path.join(path, "libraryfolders.vdf")
        if os.path.exists(vdf_path):
            try:
                with open(vdf_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                data = parse_vdf(content)
                folders = data.get("libraryfolders", data)
                
                for key, val in folders.items():
                    if isinstance(val, dict) and "path" in val:
                        lib_path = os.path.normpath(os.path.join(val["path"], "steamapps"))
                        if os.path.isdir(lib_path) and lib_path not in vdf_libraries:
                            vdf_libraries.append(lib_path)
            except Exception:
                pass
            
            if path not in vdf_libraries:
                vdf_libraries.append(path)
                
    # Filter and merge libraries
    final_libraries = []
    for lib in (vdf_libraries or libraries):
        if os.path.isdir(lib) and lib not in final_libraries:
            final_libraries.append(lib)
            
    return final_libraries

# Scan local directories for installed Steam games
def scan_local_games(libraries):
    games = {}
    for lib in libraries:
        if not os.path.isdir(lib):
            continue
        try:
            for filename in os.listdir(lib):
                if filename.startswith("appmanifest_") and filename.endswith(".acf"):
                    filepath = os.path.join(lib, filename)
                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        data = parse_vdf(content)
                        app_state = data.get("AppState", data)
                        appid = app_state.get("appid")
                        name = app_state.get("name")
                        if appid and name:
                            games[str(appid)] = {
                                "appid": str(appid),
                                "name": name,
                                "installed": True,
                                "source": "Local Library"
                            }
                    except Exception:
                        pass
        except Exception:
            pass
    return list(games.values())

# Search Steam store online
def search_steam_store(query):
    url = "https://store.steampowered.com/api/storesearch/?term=" + urllib.parse.quote(query) + "&l=english&cc=US"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = []
            if isinstance(data, dict) and "items" in data:
                for item in data["items"]:
                    results.append({
                        "appid": str(item.get("id")),
                        "name": item.get("name"),
                        "installed": False,
                        "source": "Steam Store",
                        "image": item.get("tiny_image")
                    })
            return results
    except Exception:
        return []

# Search helper combining local and online
def search_games(query):
    libs = find_steam_libraries()
    local_games = scan_local_games(libs)
    
    # Filter local games
    local_matches = [g for g in local_games if query.lower() in g["name"].lower()]
    
    # Filter online games
    online_matches = search_steam_store(query)
    
    # Deduplicate online by AppID if already present in local
    local_ids = {g["appid"] for g in local_matches}
    unique_online = [g for g in online_matches if g["appid"] not in local_ids]
    
    return local_matches + unique_online

# Locate ISO building tool cross-platform
def find_iso_tool():
    tools = ["genisoimage", "mkisofs", "xorrisofs", "xorriso"]
    if sys.platform == "win32":
        tools.append("oscdimg")
        
    for tool in tools:
        if shutil.which(tool):
            return tool
    return None

# Generate ISO or raw structure
def generate_iso(appid, title, output_path):
    tool = find_iso_tool()
    temp_dir = tempfile.mkdtemp()
    
    try:
        manifest_path = os.path.join(temp_dir, "lastdisc.json")
        manifest_data = {
            "app_id": str(appid),
            "title": title,
            "version": "1.0"
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)
            
        if not tool:
            # Fallback to directory structure
            os.makedirs(output_path, exist_ok=True)
            shutil.copy(manifest_path, os.path.join(output_path, "lastdisc.json"))
            return False, output_path
            
        # Standardise ISO output name
        if not output_path.lower().endswith(".iso") and not os.path.isdir(output_path):
            if not os.path.dirname(output_path) or os.path.exists(os.path.dirname(output_path)):
                output_path += ".iso"
                
        cmd = []
        if tool in ["genisoimage", "mkisofs", "xorrisofs"]:
            cmd = [tool, "-o", output_path, "-R", "-J", "-V", "LASTDISC", temp_dir]
        elif tool == "xorriso":
            cmd = [tool, "-as", "mkisofs", "-o", output_path, "-R", "-J", "-V", "LASTDISC", temp_dir]
        elif tool == "oscdimg":
            # oscdimg -n -d <source> <output>
            cmd = [tool, "-n", "-d", temp_dir, output_path]
            
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True, output_path
    finally:
        shutil.rmtree(temp_dir)

# CLI Interface Main Function
def run_cli():
    print("====================================================")
    print("             LastDisc Cross-Platform CD Creator     ")
    print("====================================================")
    
    query = input("Search for a Steam game: ").strip()
    if not query:
        print("Empty query. Exiting.")
        return
        
    print("\nSearching libraries and Steam store...")
    results = search_games(query)
    
    if not results:
        print("No games found matching your search query.")
        return
        
    print("\nMatches found:")
    for idx, game in enumerate(results, start=1):
        status = "[Installed]" if game["installed"] else "[Steam Catalog]"
        print(f"  {idx:2d}. {game['name']} (AppID: {game['appid']}) {status}")
        
    try:
        sel = int(input(f"\nSelect a game (1-{len(results)}): ").strip())
        if sel < 1 or sel > len(results):
            print("Invalid selection.")
            return
    except ValueError:
        print("Invalid input. Must be a number.")
        return
        
    selected = results[sel - 1]
    print(f"\nSelected: {selected['name']} (AppID: {selected['appid']})")
    
    # Target filename preparation
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', selected['name'])
    default_iso = f"{safe_name}.iso"
    
    out_path = input(f"Enter target path for output ISO (default: ./{default_iso}): ").strip()
    if not out_path:
        out_path = os.path.join(os.getcwd(), default_iso)
        
    success, final_path = generate_iso(selected['appid'], selected['name'], out_path)
    if success:
        print(f"\nSUCCESS! Created ISO file: {final_path}")
        if sys.platform == "win32":
            print("\nOn Windows, you can burn this ISO by right-clicking it and selecting 'Burn disc image',")
            print("or use third-party software like ImgBurn or Rufus.")
        else:
            print("\nBurn command examples for Linux:")
            print(f"  wodim dev=/dev/sr0 -v -data \"{final_path}\"")
            print(f"  cdrecord dev=/dev/sr0 -v -data \"{final_path}\"")
    else:
        print(f"\nCreated folder structure at: {final_path}")
        print("Please note: No ISO tools were found, so files were written directly.")

# Web API and Static Server Request Handler
class CDCreatorHTTPHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silent serving logging
        pass

    def do_GET(self):
        script_dir = os.path.dirname(os.path.realpath(__file__))
        gui_dir = os.path.join(script_dir, "gui")
        
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        # API Route: Search Games
        if path == "/api/search":
            query_params = urllib.parse.parse_qs(parsed.query)
            q = query_params.get("q", [""])[0]
            
            results = search_games(q) if q else []
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(results).encode('utf-8'))
            return
            
        # API Route: Image Proxy (to bypass CORS on CDN images)
        elif path == "/api/proxy-image":
            query_params = urllib.parse.parse_qs(parsed.query)
            image_url = query_params.get("url", [""])[0]
            
            if not image_url:
                self.send_response(400)
                self.end_headers()
                return
                
            try:
                req = urllib.request.Request(
                    image_url, 
                    headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    self.send_response(200)
                    self.send_header("Content-Type", content_type)
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Cache-Control", "public, max-age=86400")
                    self.end_headers()
                    shutil.copyfileobj(response, self.wfile)
            except Exception:
                self.send_response(500)
                self.end_headers()
            return
            
        # Serve static frontend files
        if path == "/" or path == "/index.html":
            filepath = os.path.join(gui_dir, "index.html")
            content_type = "text/html"
        elif path.endswith(".css"):
            filepath = os.path.join(gui_dir, "style.css")
            content_type = "text/css"
        elif path.endswith(".js"):
            filepath = os.path.join(gui_dir, "app.js")
            content_type = "application/javascript"
        else:
            # Fallback simple server
            super().do_GET()
            return
            
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File not found.")

    def do_POST(self):
        if self.path == "/api/create-iso":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                params = json.loads(post_data.decode('utf-8'))
                
                appid = params.get("appid")
                title = params.get("title")
                
                if not appid or not title:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"Missing AppID or Title")
                    return
                
                fd, temp_iso_path = tempfile.mkstemp(suffix=".iso")
                os.close(fd)
                
                try:
                    success, final_path = generate_iso(appid, title, temp_iso_path)
                    if success:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/octet-stream")
                        safe_title = re.sub(r'[^a-zA-Z0-9_-]', '_', title)
                        self.send_header("Content-Disposition", f'attachment; filename="{safe_title}.iso"')
                        self.send_header("Access-Control-Allow-Origin", "*")
                        
                        size = os.path.getsize(temp_iso_path)
                        self.send_header("Content-Length", str(size))
                        self.end_headers()
                        
                        with open(temp_iso_path, "rb") as f:
                            shutil.copyfileobj(f, self.wfile)
                    else:
                        # Created folder structure instead
                        self.send_response(422)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "error": "No ISO creation tools installed. Generated manifest folder structure.",
                            "path": final_path
                        }).encode('utf-8'))
                finally:
                    if os.path.exists(temp_iso_path):
                        os.remove(temp_iso_path)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))

# Main Program Entry Point
def main():
    parser = argparse.ArgumentParser(description="LastDisc CD Creator tool.")
    parser.add_argument("--gui", action="store_true", help="Start the Web GUI server.")
    parser.add_argument("--port", type=int, default=8000, help="Web Server port (default: 8000).")
    
    args = parser.parse_args()
    
    if args.gui:
        script_dir = os.path.dirname(os.path.realpath(__file__))
        gui_dir = os.path.join(script_dir, "gui")
        if not os.path.exists(gui_dir):
            os.makedirs(gui_dir, exist_ok=True)
            
        server_address = ('', args.port)
        httpd = HTTPServer(server_address, CDCreatorHTTPHandler)
        print("====================================================")
        print("          LastDisc GUI Server Started               ")
        print("====================================================")
        print(f"Server URL: http://localhost:{args.port}")
        print("Press Ctrl+C to terminate.")
        
        # Open browser in a separate thread/non-blocking
        webbrowser.open(f"http://localhost:{args.port}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
    else:
        run_cli()

if __name__ == "__main__":
    main()
