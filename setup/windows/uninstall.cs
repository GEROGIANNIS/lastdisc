using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security.Principal;
using System.Windows.Forms;

class UninstallerForm : Form {
    private Label lblTitle;
    private Label lblDesc;
    private Label lblStatus;
    private Button btnUninstall;
    private Button btnClose;

    public UninstallerForm() {
        // UI Layout Configuration (Premium Dark Theme)
        this.Text = "LastDisc Uninstaller";
        this.Size = new Size(420, 260);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.MinimizeBox = false;
        this.BackColor = Color.FromArgb(20, 20, 24);
        this.ForeColor = Color.FromArgb(243, 244, 246);
        this.Font = new Font("Segoe UI", 9.5F);

        // Title Label
        lblTitle = new Label();
        lblTitle.Text = "💿 LastDisc Uninstaller";
        lblTitle.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
        lblTitle.ForeColor = Color.FromArgb(255, 0, 85); // Accent red
        lblTitle.Location = new Point(20, 20);
        lblTitle.Size = new Size(380, 35);
        this.Controls.Add(lblTitle);

        // Description Label
        lblDesc = new Label();
        lblDesc.Text = "This utility removes the LastDisc background watcher task and deletes the installed watcher files from your system.";
        lblDesc.Location = new Point(24, 65);
        lblDesc.Size = new Size(360, 50);
        this.Controls.Add(lblDesc);

        // Status Label
        lblStatus = new Label();
        lblStatus.Text = "Status: Ready to uninstall";
        lblStatus.ForeColor = Color.FromArgb(156, 163, 175); // Secondary grey
        lblStatus.Location = new Point(24, 125);
        lblStatus.Size = new Size(360, 20);
        this.Controls.Add(lblStatus);

        // Uninstall Button
        btnUninstall = new Button();
        btnUninstall.Text = "🗑️ Uninstall Watcher";
        btnUninstall.BackColor = Color.FromArgb(255, 0, 85); // Crimson red
        btnUninstall.ForeColor = Color.White;
        btnUninstall.FlatStyle = FlatStyle.Flat;
        btnUninstall.FlatAppearance.BorderSize = 0;
        btnUninstall.Location = new Point(140, 165);
        btnUninstall.Size = new Size(160, 35);
        btnUninstall.Cursor = Cursors.Hand;
        btnUninstall.Click += BtnUninstall_Click;
        this.Controls.Add(btnUninstall);

        // Close Button
        btnClose = new Button();
        btnClose.Text = "Close";
        btnClose.BackColor = Color.FromArgb(40, 40, 44);
        btnClose.ForeColor = Color.White;
        btnClose.FlatStyle = FlatStyle.Flat;
        btnClose.FlatAppearance.BorderSize = 0;
        btnClose.Location = new Point(310, 165);
        btnClose.Size = new Size(80, 35);
        btnClose.Cursor = Cursors.Hand;
        btnClose.Click += (s, e) => this.Close();
        this.Controls.Add(btnClose);
    }

    private void BtnUninstall_Click(object sender, EventArgs e) {
        if (!IsAdministrator()) {
            lblStatus.Text = "Requesting administrator elevation...";
            ElevateAndRun();
            this.Close();
            return;
        }

        btnUninstall.Enabled = false;
        lblStatus.Text = "Uninstalling...";
        lblStatus.ForeColor = Color.FromArgb(255, 0, 85);
        Application.DoEvents();

        try {
            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string uninstallPs1 = Path.Combine(currentDir, "uninstall.ps1");

            if (!File.Exists(uninstallPs1)) {
                MessageBox.Show("Error: uninstall.ps1 not found in current directory.\nExpected path: " + uninstallPs1, "Uninstallation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.Text = "Status: uninstall.ps1 missing";
                lblStatus.ForeColor = Color.Red;
                btnUninstall.Enabled = true;
                return;
            }

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

                if (p.ExitCode == 0) {
                    lblStatus.Text = "Status: Uninstalled successfully!";
                    lblStatus.ForeColor = Color.FromArgb(16, 185, 129); // Green
                    MessageBox.Show("LastDisc Watcher has been successfully uninstalled from your system.", "Uninstallation Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
                } else {
                    lblStatus.Text = "Status: Uninstallation failed";
                    lblStatus.ForeColor = Color.Red;
                    MessageBox.Show("Uninstallation failed:\n" + error, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnUninstall.Enabled = true;
                }
            }
        } catch (Exception ex) {
            lblStatus.Text = "Status: Error";
            lblStatus.ForeColor = Color.Red;
            MessageBox.Show("An error occurred: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            btnUninstall.Enabled = true;
        }
    }

    private static bool IsAdministrator() {
        WindowsIdentity identity = WindowsIdentity.GetCurrent();
        WindowsPrincipal principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }

    private static void ElevateAndRun() {
        string exePath = Process.GetCurrentProcess().MainModule.FileName;
        ProcessStartInfo psi = new ProcessStartInfo {
            FileName = exePath,
            Verb = "runas",
            UseShellExecute = true
        };
        try {
            Process.Start(psi);
        } catch (Exception) {
            MessageBox.Show("Administrator elevation was denied.", "Elevation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    [STAThread]
    static void Main() {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new UninstallerForm());
    }
}
