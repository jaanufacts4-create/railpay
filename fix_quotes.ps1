$file = "C:\Users\Hp\Desktop\Railpay\src\components\RailPayOBHS.jsx"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$content = $content.Replace([char]0x201C, [char]0x22).Replace([char]0x201D, [char]0x22)
[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done"
