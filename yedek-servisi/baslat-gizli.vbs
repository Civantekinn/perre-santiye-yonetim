' Perre Yedek - gizli baslatici (pencere acmaz)
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

servisDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = "C:\Program Files\nodejs\node.exe"
indexJs = servisDir & "\index.js"

If Not fso.FileExists(nodeExe) Then
  nodeExe = "node"
End If

cmd = """" & nodeExe & """ """ & indexJs & """"
sh.CurrentDirectory = servisDir
sh.Run cmd, 0, False
