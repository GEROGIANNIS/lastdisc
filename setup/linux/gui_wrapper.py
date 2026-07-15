#!/usr/bin/env python3
import os
import subprocess
import sys

try:
    import tkinter as tk
    from tkinter import messagebox
except ImportError:
    print("====================================================")
    print("Error: Tkinter is required for the graphical setup.")
    print("====================================================")
    print("Please install it using your package manager:")
    print("  Ubuntu/Debian: sudo apt install python3-tk")
    print("  Fedora:        sudo dnf install python3-tkinter")
    print("  Arch Linux:    sudo pacman -S tk")
    print()
    sys.exit(1)

class SetupApp:
    def __init__(self, root, mode="install"):
        self.root = root
        self.mode = mode
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Configure Window
        self.root.title(f"LastDisc {mode.capitalize()}er")
        self.root.geometry("420x260")
        self.root.resizable(False, False)
        self.root.configure(bg="#141418")
        
        # Accent colors
        self.accent_color = "#00DFD8" if mode == "install" else "#FF0055"
        
        # Title
        self.lbl_title = tk.Label(
            root, 
            text=f"💿 LastDisc Watcher {mode.capitalize()}er", 
            font=("Helvetica", 16, "bold"), 
            fg=self.accent_color, 
            bg="#141418"
        )
        self.lbl_title.pack(anchor="w", padx=20, pady=(20, 10))
        
        # Description
        desc_text = (
            "This utility installs the background watcher task to launch your Steam games automatically upon inserting game discs or USBs."
            if mode == "install" else
            "This utility removes the LastDisc background watcher task and deletes the installed watcher files from your system."
        )
        self.lbl_desc = tk.Label(
            root,
            text=desc_text,
            font=("Helvetica", 9),
            fg="#F3F4F6",
            bg="#141418",
            wraplength=380,
            justify="left"
        )
        self.lbl_desc.pack(anchor="w", padx=24, pady=(0, 15))
        
        # Status Label
        self.lbl_status = tk.Label(
            root,
            text=f"Status: Ready to {mode}",
            font=("Helvetica", 9),
            fg="#9CA3AF",
            bg="#141418"
        )
        self.lbl_status.pack(anchor="w", padx=24, pady=(0, 20))
        
        # Buttons Frame
        self.btn_frame = tk.Frame(root, bg="#141418")
        self.btn_frame.pack(anchor="e", padx=20, pady=10)
        
        # Action Button
        action_text = "⚡ Install & Start Watcher" if mode == "install" else "🗑️ Uninstall Watcher"
        self.btn_action = tk.Button(
            self.btn_frame,
            text=action_text,
            font=("Helvetica", 9, "bold"),
            fg="white",
            bg="#0070F3" if mode == "install" else "#FF0055",
            activeforeground="white",
            activebackground="#005BDB" if mode == "install" else "#CC0044",
            bd=0,
            padx=15,
            pady=8,
            cursor="hand2",
            command=self.run_setup
        )
        self.btn_action.pack(side="left", padx=5)
        
        # Close Button
        self.btn_close = tk.Button(
            self.btn_frame,
            text="Close",
            font=("Helvetica", 9),
            fg="white",
            bg="#28282C",
            activeforeground="white",
            activebackground="#1E1E22",
            bd=0,
            padx=15,
            pady=8,
            cursor="hand2",
            command=root.quit
        )
        self.btn_close.pack(side="left", padx=5)

    def run_setup(self):
        self.btn_action.configure(state="disabled")
        self.lbl_status.configure(text="Processing...", fg=self.accent_color)
        self.root.update()
        
        script_name = "install.sh" if self.mode == "install" else "uninstall.sh"
        script_path = os.path.join(self.script_dir, script_name)
        
        if not os.path.exists(script_path):
            messagebox.showerror(
                "Error", 
                f"Script not found:\n{script_path}"
            )
            self.lbl_status.configure(text=f"Status: {script_name} missing", fg="red")
            self.btn_action.configure(state="normal")
            return
            
        try:
            # Ensure scripts are executable
            os.chmod(script_path, 0o755)
            
            # Run script
            result = subprocess.run(
                [script_path], 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True
            )
            
            if result.returncode == 0:
                self.lbl_status.configure(
                    text=f"Status: {self.mode.capitalize()}ed successfully!", 
                    fg="#10B981"
                )
                messagebox.showinfo(
                    "Success", 
                    f"LastDisc Watcher has been successfully {self.mode}ed!"
                )
            else:
                self.lbl_status.configure(text="Status: Failed", fg="red")
                messagebox.showerror(
                    "Error", 
                    f"Execution failed:\n{result.stderr}"
                )
                self.btn_action.configure(state="normal")
        except Exception as ex:
            self.lbl_status.configure(text="Status: Error", fg="red")
            messagebox.showerror("Error", f"An error occurred:\n{str(ex)}")
            self.btn_action.configure(state="normal")

if __name__ == "__main__":
    mode = "install"
    if len(sys.argv) > 1 and sys.argv[1].lower() == "uninstall":
        mode = "uninstall"
        
    root = tk.Tk()
    app = SetupApp(root, mode)
    root.mainloop()
