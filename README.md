# 🔥 firelog-ui

A local, lightweight web interface for the Firebase Emulator Suite. It captures messy terminal outputs and transforms them into a clean, collapsible, Cloud Console-style log viewer.

## ✨ Features
* **Smart UI**: Formats JSON payloads into beautiful, collapsible, syntax-highlighted blocks.
* **Dual Input**: Read directly from a live file or pipe standard output (`stdin`) right into the viewer.
* **Invocation Filtering**: Dynamically detects execution IDs and lets you filter logs by specific Cloud Function invocations and paths.
* **Smart Scrolling**: Automatically stays at the bottom of the live log stream, but gently pauses if you scroll up to inspect something.

## 🚀 Installation

Install the package globally via npm:

```bash
npm install -g firelog-ui
```

## 💻 Usage

You can feed logs into `firelog-ui` using two different methods depending on your workflow:

### Option 1: Pipe directly from the emulator (Recommended)
This method catches both standard output and errors, piping them directly into the viewer without creating any intermediary text files on your machine.

```bash
firebase emulators:start 2>&1 | firelog-ui
```

### Option 2: Tail an existing log file
If you prefer to keep a hard copy of your logs, you can pipe the emulator output into a file and tell `firelog-ui` to tail it.

```bash
# 1. Start the emulator and save the output to a file
firebase emulators:start &> fb-logs.txt

# 2. Run firelog-ui to watch the file
firelog-ui --file fb-logs.txt
```

### View Your Logs
Once the tool is running, simply open your browser and navigate to:
**`http://localhost:4500`**

---

## 📝 License
This project is licensed under the [MIT License](LICENSE).

**Author:** Amir Hassanzadeh