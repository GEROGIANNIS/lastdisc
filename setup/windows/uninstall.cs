using System;
using System.Diagnostics;
using System.IO;
using System.Security.Principal;

class Uninstaller {
    static void Main() {
        Console.Title = "LastDisc Uninstaller";
        Console.WriteLine("====================================================");
        Console.WriteLine("            LastDisc Watcher Uninstaller            ");
        Console.WriteLine("====================================================");
        Console.WriteLine();

        if (!IsAdministrator()) {
            Console.WriteLine("Requesting Administrator permissions...");
            ElevateAndRun();
            return;
        }

        try {
            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string uninstallPs1 = Path.Combine(currentDir, "uninstall.ps1");

            if (!File.Exists(uninstallPs1)) {
                Console.WriteLine("Error: uninstall.ps1 not found in current directory.");
                Console.WriteLine("Expected path: " + uninstallPs1);
                Console.ReadLine();
                return;
            }

            Console.WriteLine("Running uninstallation script...");
            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + uninstallPs1 + "\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (Process p = Process.Start(psi)) {
                string output = p.StandardOutput.ReadToEnd();
                string error = p.StandardError.ReadToEnd();
                p.WaitForExit();

                Console.WriteLine(output);
                if (!string.IsNullOrEmpty(error)) {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("Errors: " + error);
                    Console.ResetColor();
                }

                if (p.ExitCode == 0) {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("Uninstallation completed successfully!");
                    Console.ResetColor();
                } else {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("Uninstallation failed with exit code " + p.ExitCode);
                    Console.ResetColor();
                }
            }
        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("An error occurred: " + ex.Message);
            Console.ResetColor();
        }

        Console.WriteLine();
        Console.WriteLine("Press Enter to exit...");
        Console.ReadLine();
    }

    static bool IsAdministrator() {
        WindowsIdentity identity = WindowsIdentity.GetCurrent();
        WindowsPrincipal principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }

    static void ElevateAndRun() {
        string exePath = Process.GetCurrentProcess().MainModule.FileName;
        ProcessStartInfo psi = new ProcessStartInfo {
            FileName = exePath,
            Verb = "runas",
            UseShellExecute = true
        };
        try {
            Process.Start(psi);
        } catch (Exception) {
            Console.WriteLine("Elevation was denied by user.");
            Console.ReadLine();
        }
    }
}
