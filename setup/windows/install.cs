using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security.Principal;
using System.Windows.Forms;

class InstallerForm : Form {
    private Label lblTitle;
    private Label lblDesc;
    private Label lblStatus;
    private Button btnInstall;
    private Button btnClose;

    public InstallerForm() {
        // UI Layout Configuration (Premium Dark Theme)
        this.Text = "LastDisc Installer";
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
        lblTitle.Text = "💿 LastDisc Watcher";
        lblTitle.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
        lblTitle.ForeColor = Color.FromArgb(0, 223, 216); // Accent teal
        lblTitle.Location = new Point(20, 20);
        lblTitle.Size = new Size(380, 35);
        this.Controls.Add(lblTitle);

        // Description Label
        lblDesc = new Label();
        lblDesc.Text = "This utility installs the background watcher task to launch your Steam games automatically upon inserting game discs or USBs.";
        lblDesc.Location = new Point(24, 65);
        lblDesc.Size = new Size(360, 50);
        this.Controls.Add(lblDesc);

        // Status Label
        lblStatus = new Label();
        lblStatus.Text = "Status: Ready to install";
        lblStatus.ForeColor = Color.FromArgb(156, 163, 175); // Secondary grey
        lblStatus.Location = new Point(24, 125);
        lblStatus.Size = new Size(360, 20);
        this.Controls.Add(lblStatus);

        // Install Button
        btnInstall = new Button();
        btnInstall.Text = "⚡ Install & Start Watcher";
        btnInstall.BackColor = Color.FromArgb(0, 112, 243); // Premium blue
        btnInstall.ForeColor = Color.White;
        btnInstall.FlatStyle = FlatStyle.Flat;
        btnInstall.FlatAppearance.BorderSize = 0;
        btnInstall.Location = new Point(140, 165);
        btnInstall.Size = new Size(160, 35);
        btnInstall.Cursor = Cursors.Hand;
        btnInstall.Click += BtnInstall_Click;
        this.Controls.Add(btnInstall);

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

    private void BtnInstall_Click(object sender, EventArgs e) {
        if (!IsAdministrator()) {
            lblStatus.Text = "Requesting administrator elevation...";
            ElevateAndRun();
            this.Close();
            return;
        }

        btnInstall.Enabled = false;
        lblStatus.Text = "Installing...";
        lblStatus.ForeColor = Color.FromArgb(0, 223, 216);
        Application.DoEvents();

        try {
            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string installPs1 = Path.Combine(currentDir, "install.ps1");

            if (!File.Exists(installPs1)) {
                MessageBox.Show("Error: install.ps1 not found in current directory.\nExpected path: " + installPs1, "Installation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                lblStatus.Text = "Status: install.ps1 missing";
                lblStatus.ForeColor = Color.Red;
                btnInstall.Enabled = true;
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + installPs1 + "\"",
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
                    lblStatus.Text = "Status: Installed successfully!";
                    lblStatus.ForeColor = Color.FromArgb(16, 185, 129); // Green
                    
                    // Start watcher
                    Process.Start(new ProcessStartInfo {
                        FileName = "powershell.exe",
                        Arguments = "-NoProfile -Command \"Start-ScheduledTask -TaskName LastDiscWatcher\"",
                        CreateNoWindow = true,
                        UseShellExecute = false
                    }).WaitForExit();

                    MessageBox.Show("LastDisc Watcher has been successfully installed and started in the background!", "Installation Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
                } else {
                    lblStatus.Text = "Status: Installation failed";
                    lblStatus.ForeColor = Color.Red;
                    MessageBox.Show("Installation failed:\n" + error, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnInstall.Enabled = true;
                }
            }
        } catch (Exception ex) {
            lblStatus.Text = "Status: Error";
            lblStatus.ForeColor = Color.Red;
            MessageBox.Show("An error occurred: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            btnInstall.Enabled = true;
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
        Application.Run(new InstallerForm());
    }
}
