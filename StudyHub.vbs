Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\Study App"
WshShell.Run "cmd /c start """" python main.py", 0, False
