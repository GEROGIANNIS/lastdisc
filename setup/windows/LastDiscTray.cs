using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

class LastDiscTrayApp : ApplicationContext {
    private NotifyIcon trayIcon;
    private ContextMenuStrip contextMenu;
    private ToolStripMenuItem itemDashboard;
    private ToolStripMenuItem itemStart;
    private ToolStripMenuItem itemStop;
    private ToolStripMenuItem itemLogs;
    private ToolStripMenuItem itemExit;

    public LastDiscTrayApp() {
        // Initialize Context Menu
        contextMenu = new ContextMenuStrip();
        contextMenu.Opening += ContextMenu_Opening;

        itemDashboard = new ToolStripMenuItem("🖥️ Open Dashboard", null, OpenDashboard_Click);
        itemStart = new ToolStripMenuItem("🟢 Start Watcher", null, StartWatcher_Click);
        itemStop = new ToolStripMenuItem("🔴 Stop Watcher", null, StopWatcher_Click);
        itemLogs = new ToolStripMenuItem("📋 View Watcher Logs", null, ViewLogs_Click);
        
        ToolStripSeparator sep = new ToolStripSeparator();
        
        itemExit = new ToolStripMenuItem("❌ Exit", null, Exit_Click);

        contextMenu.Items.Add(itemDashboard);
        contextMenu.Items.Add(itemStart);
        contextMenu.Items.Add(itemStop);
        contextMenu.Items.Add(itemLogs);
        contextMenu.Items.Add(sep);
        contextMenu.Items.Add(itemExit);

        // Draw custom CD Icon in memory
        Icon discIcon = CreateDiscIcon();

        // Initialize Tray Icon
        trayIcon = new NotifyIcon {
            Icon = discIcon,
            ContextMenuStrip = contextMenu,
            Text = "LastDisc Watcher: Checking Status...",
            Visible = true
        };

        // Double click tray icon opens the dashboard
        trayIcon.DoubleClick += OpenDashboard_Click;
    }

    private static Icon CreateDiscIcon() {
        using (Bitmap bmp = new Bitmap(32, 32))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);
            
            // Outer CD ring (Teal)
            using (Pen p = new Pen(Color.FromArgb(0, 223, 216), 3)) {
                g.DrawEllipse(p, 4, 4, 24, 24);
            }
            // Inner CD hole border (Blue)
            using (Pen p = new Pen(Color.FromArgb(0, 112, 243), 2)) {
                g.DrawEllipse(p, 12, 12, 8, 8);
            }
            // CD center plastic
            using (Brush b = new SolidBrush(Color.FromArgb(30, 30, 34))) {
                g.FillEllipse(b, 13, 13, 6, 6);
            }
            
            IntPtr hIcon = bmp.GetHicon();
            return Icon.FromHandle(hIcon);
        }
    }

    private void ContextMenu_Opening(object sender, System.ComponentModel.CancelEventArgs e) {
        bool isRunning = IsWatcherRunning();
        itemStart.Enabled = !isRunning;
        itemStop.Enabled = isRunning;
        trayIcon.Text = "LastDisc Watcher: " + (isRunning ? "Running" : "Stopped");
    }

    private bool IsWatcherRunning() {
        try {
            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = "schtasks.exe",
                Arguments = "/query /tn \"LastDiscWatcher\" /fo csv /nh",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using (Process p = Process.Start(psi)) {
                string output = p.StandardOutput.ReadToEnd();
                p.WaitForExit();
                return output.Contains("Running") || output.Contains("Ready");
            }
        } catch {
            return false;
        }
    }

    private void OpenDashboard_Click(object sender, EventArgs e) {
        try {
            Process.Start(new ProcessStartInfo {
                FileName = "http://127.0.0.1:8000",
                UseShellExecute = true
            });
        } catch (Exception ex) {
            MessageBox.Show("Could not open browser: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void StartWatcher_Click(object sender, EventArgs e) {
        try {
            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = "schtasks.exe",
                Arguments = "/run /tn \"LastDiscWatcher\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            Process.Start(psi).WaitForExit();
            trayIcon.ShowBalloonTip(3000, "LastDisc Watcher", "Watcher service started successfully.", ToolTipIcon.Info);
        } catch (Exception ex) {
            MessageBox.Show("Failed to start watcher task: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void StopWatcher_Click(object sender, EventArgs e) {
        try {
            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = "schtasks.exe",
                Arguments = "/end /tn \"LastDiscWatcher\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            Process.Start(psi).WaitForExit();
            trayIcon.ShowBalloonTip(3000, "LastDisc Watcher", "Watcher service stopped.", ToolTipIcon.Info);
        } catch (Exception ex) {
            MessageBox.Show("Failed to stop watcher task: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void ViewLogs_Click(object sender, EventArgs e) {
        try {
            string logDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LastDisc");
            string logFile = Path.Combine(logDir, "watcher.log");

            if (!File.Exists(logFile)) {
                // Create log directory if missing
                if (!Directory.Exists(logDir)) {
                    Directory.CreateDirectory(logDir);
                }
                File.WriteAllText(logFile, "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] Log file initialized by tray app.\r\n");
            }

            Process.Start("notepad.exe", logFile);
        } catch (Exception ex) {
            MessageBox.Show("Failed to open log file: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void Exit_Click(object sender, EventArgs e) {
        trayIcon.Visible = false;
        Application.Exit();
    }

    [STAThread]
    static void Main() {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new LastDiscTrayApp());
    }
}
