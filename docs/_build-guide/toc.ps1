$docPath = "C:\Users\ASUS\Documents\المنصة الوطنية\projects\docs\دليل-الحاج-لاستخدام-المنصة.docx"
$pdfPath = "C:\Users\ASUS\AppData\Local\Temp\claude\c--Users-ASUS-Documents---------------\42752616-a5ce-435e-b7c8-d6732dd3092e\scratchpad\review.pdf"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($docPath, $false, $false)
$doc.Fields.Update() | Out-Null
foreach ($t in $doc.TablesOfContents) { $t.Update() }
$doc.Save()
Write-Output ("pages: " + $doc.ComputeStatistics(2))
$doc.ExportAsFixedFormat($pdfPath, 17)
$doc.Close($false)
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Output "done"
