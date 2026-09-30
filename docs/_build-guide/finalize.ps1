param([string]$Docx, [string]$Pdf)
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
$doc = $word.Documents.Open($Docx, $false, $false)
$doc.Fields.Update() | Out-Null
foreach ($t in $doc.TablesOfContents) { $t.Update() }
$doc.Save()
Write-Output ("pages: " + $doc.ComputeStatistics(2))
if ($Pdf) {
  $word.ActivePrinter = "Microsoft Print to PDF"
  $doc.PrintOut($false, $false, 0, $Pdf, "", "", 0, 1, "", 0, $true)
  while ($word.BackgroundPrintingStatus -gt 0) { Start-Sleep -Seconds 2 }
  Start-Sleep -Seconds 8
}
$doc.Close($false); $word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Output "finalized"
